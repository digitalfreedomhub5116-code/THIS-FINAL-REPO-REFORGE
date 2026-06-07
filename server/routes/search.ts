/**
 * server/routes/search.ts
 *
 * POST /api/search — proxies the client to Vertex AI Search (Discovery Engine).
 *
 * Why this exists:
 *   - The browser cannot mint a Google Cloud access token (it would need the
 *     service-account JSON, which must never ship to clients).
 *   - The Discovery Engine HTTP API is one round-trip, so the proxy is thin.
 *
 * Behaviour:
 *   - Body: { query: string, type?: 'food' | 'skill' | 'exercise', pageSize?: number }
 *   - Returns: { results, total, latencyMs, cached }
 *   - 5s timeout to the upstream so a Vertex hiccup never wedges the client.
 *   - 5-minute LRU cache keyed by (query, type) so repeat queries are free.
 *   - Authenticates with the existing service-account credentials we already
 *     load at boot for Vertex Gemini — no new env vars needed.
 *
 * Known costs (as of 2026-05):
 *   - Custom Search basic: $2 per 1000 queries after the first 10k/month free.
 *   - Cache hit: ₹0 (in-memory, never reaches Google).
 */
import { Router, Request, Response } from 'express';
import { GoogleAuth } from 'google-auth-library';

const router = Router();

// ── Engine configuration (validated against the live data store) ──
const PROJECT_NUMBER = process.env.GOOGLE_CLOUD_PROJECT_NUMBER || '20910572316';
const SEARCH_LOCATION = process.env.DISCOVERY_ENGINE_LOCATION || 'global';
const SEARCH_ENGINE_ID = process.env.DISCOVERY_ENGINE_ID || 'reforge-search-app_1780164568719';

const SEARCH_URL =
  `https://discoveryengine.googleapis.com/v1/projects/${PROJECT_NUMBER}` +
  `/locations/${SEARCH_LOCATION}/collections/default_collection/engines/${SEARCH_ENGINE_ID}` +
  `/servingConfigs/default_search:search`;

// ── Auth (singleton — reuses the credentials file written at boot by geminiRetry) ──
let _auth: GoogleAuth | null = null;
function getAuth(): GoogleAuth {
  if (_auth) return _auth;
  _auth = new GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
  });
  return _auth;
}

// ── Tiny LRU cache (5 min TTL, 256 entries max) ──
interface CacheEntry {
  expiresAt: number;
  payload: any;
}
const CACHE_TTL_MS = 5 * 60 * 1000;
const CACHE_MAX = 256;
const cache = new Map<string, CacheEntry>();

function cacheKey(query: string, type?: string): string {
  return `${type || 'all'}::${query.toLowerCase().trim()}`;
}
function cacheGet(key: string): any | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) { cache.delete(key); return null; }
  // Refresh insertion order for LRU semantics.
  cache.delete(key); cache.set(key, entry);
  return entry.payload;
}
function cacheSet(key: string, payload: any): void {
  if (cache.size >= CACHE_MAX) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey) cache.delete(oldestKey);
  }
  cache.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, payload });
}

// ── Hand-rolled fetch with timeout (no AbortController in older node typings) ──
async function fetchWithTimeout(url: string, init: any, ms: number): Promise<globalThis.Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await (globalThis.fetch as any)(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

// ── Result shape returned to clients ──
interface ApiSearchResult {
  id: string;
  type: string;
  name: string;
  snippet?: string;
  structData: Record<string, unknown>;
}

// ──────────────────────────────────────────────────────────────────────────
// POST /api/search
// ──────────────────────────────────────────────────────────────────────────
router.post('/', async (req: Request, res: Response) => {
  const t0 = Date.now();
  const query = String(req.body?.query || '').trim();
  const type = req.body?.type ? String(req.body.type) : undefined;
  const pageSize = Math.min(20, Math.max(1, Number(req.body?.pageSize) || 10));

  if (!query) {
    return res.status(400).json({ error: 'Missing "query" string in body.' });
  }

  // Cache check (5 min TTL).
  const ck = cacheKey(query, type);
  const cached = cacheGet(ck);
  if (cached) {
    return res.json({ ...cached, cached: true, latencyMs: Date.now() - t0 });
  }

  // Build the upstream request body.
  const body: any = {
    query,
    pageSize,
    queryExpansionSpec: { condition: 'AUTO' },
    spellCorrectionSpec: { mode: 'AUTO' },
  };
  if (type) {
    // Server-side filter on the type field we set in the corpus generator.
    // Discovery Engine expects a Google standard SQL-ish syntax.
    body.filter = `type: ANY("${type}")`;
  }

  let token: string;
  try {
    const client = await getAuth().getClient();
    const tok = await client.getAccessToken();
    if (!tok?.token) throw new Error('No access token');
    token = tok.token;
  } catch (err: any) {
    console.error('[search] auth failed:', err?.message || err);
    return res.status(503).json({ error: 'Search auth unavailable. Try again shortly.' });
  }

  let upstream: globalThis.Response;
  try {
    upstream = await fetchWithTimeout(
      SEARCH_URL,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      },
      5000,
    );
  } catch (err: any) {
    const aborted = err?.name === 'AbortError';
    console.warn(`[search] upstream ${aborted ? 'timeout' : 'error'}:`, err?.message || err);
    return res.status(aborted ? 504 : 502).json({
      error: aborted ? 'Search timed out. Falling back to local results.' : 'Search upstream error.',
    });
  }

  if (!upstream.ok) {
    const text = await upstream.text().catch(() => '');
    console.warn(`[search] upstream ${upstream.status}:`, text.slice(0, 300));
    return res.status(upstream.status).json({
      error: `Search returned ${upstream.status}.`,
    });
  }

  const json: any = await upstream.json().catch(() => ({}));

  const rawResults = Array.isArray(json.results) ? json.results : [];
  const results: ApiSearchResult[] = rawResults.map((r: any) => {
    const data = r?.document?.structData ?? {};
    return {
      id: r?.id || r?.document?.id || '',
      type: typeof data.type === 'string' ? data.type : (type || 'unknown'),
      name: typeof data.name === 'string' ? data.name : '(no name)',
      snippet: typeof data.description === 'string' ? data.description.slice(0, 240) : undefined,
      structData: data,
    };
  });

  const payload = {
    results,
    total: typeof json.totalSize === 'number' ? json.totalSize : results.length,
  };
  cacheSet(ck, payload);

  return res.json({ ...payload, cached: false, latencyMs: Date.now() - t0 });
});

export default router;
