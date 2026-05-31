/**
 * lib/searchClient.ts
 *
 * Client wrapper around POST /api/search with a Fuse.js fallback.
 *
 * Why this exists:
 *   - We want server-side semantic search (Vertex AI Search) when it's
 *     available, but the user must still get instant local matches if the
 *     server is unreachable, slow, or the feature flag is off.
 *   - The hook also handles request debouncing + cancellation so a fast typist
 *     doesn't queue 8 in-flight requests.
 *
 * Usage:
 *   const { results, isRemote } = await searchCatalogue(query, 'food', { fallbackItems, fallbackKeys });
 *
 * The caller passes `fallbackItems` (the local array) and `fallbackKeys`
 * (the Fuse search keys) so this module never has to know about specific
 * data shapes — it just does generic semantic-first search with a local
 * tiebreaker.
 */
import Fuse from 'fuse.js';
import { API_BASE } from './apiConfig';

// ── Types ──
export type SearchType = 'food' | 'skill' | 'exercise';

export interface RemoteSearchResult {
  id: string;
  type: string;
  name: string;
  snippet?: string;
  structData: Record<string, unknown>;
}

export interface SearchResponse<TLocal> {
  /** True when results came from /api/search (i.e. Vertex AI Search). */
  isRemote: boolean;
  /** Matched items in the original local-array shape (preferred path) OR
   *  raw Vertex docs if no local match was possible. */
  results: TLocal[];
  /** Total count reported by the server (may be larger than results.length). */
  total: number;
  /** Round-trip latency in ms (best-effort). */
  latencyMs: number;
}

export interface FallbackOptions<TLocal> {
  /** Local array to fall back to when the API is unavailable / disabled. */
  fallbackItems: TLocal[];
  /** Fuse.js search keys for the local-array fallback. */
  fallbackKeys: string[];
  /** Used to map a Vertex doc back to the local array (default: name). */
  matchBy?: (item: TLocal) => string;
  /** How many results to return. Default 12. */
  pageSize?: number;
}

// ── Feature flag (Vite import.meta.env or fallback) ──
function isApiEnabled(): boolean {
  // Default ON. Set VITE_SEARCH_API_ENABLED=false to force-disable in dev.
  try {
    const v = (import.meta as any)?.env?.VITE_SEARCH_API_ENABLED;
    if (typeof v === 'string') return v.toLowerCase() !== 'false';
    return true;
  } catch {
    return true;
  }
}

// ── In-flight request controller (per-type) ──
const _inFlight = new Map<string, AbortController>();

function abortPrevious(key: string): AbortController {
  const prev = _inFlight.get(key);
  if (prev) prev.abort();
  const ctrl = new AbortController();
  _inFlight.set(key, ctrl);
  return ctrl;
}

// ── Local Fuse fallback ──
function localFallback<TLocal>(
  query: string,
  opts: FallbackOptions<TLocal>,
): SearchResponse<TLocal> {
  const fuse = new Fuse(opts.fallbackItems, {
    keys: opts.fallbackKeys,
    threshold: 0.4,
    ignoreLocation: true,
  });
  const trimmed = query.trim();
  if (!trimmed) {
    return { isRemote: false, results: opts.fallbackItems.slice(0, opts.pageSize ?? 12), total: opts.fallbackItems.length, latencyMs: 0 };
  }
  const matches = fuse.search(trimmed, { limit: opts.pageSize ?? 12 });
  return {
    isRemote: false,
    results: matches.map((m) => m.item),
    total: matches.length,
    latencyMs: 0,
  };
}

// ── Match Vertex docs back to local objects (so callers keep their typed shape) ──
function reconcileToLocal<TLocal>(
  remote: RemoteSearchResult[],
  opts: FallbackOptions<TLocal>,
): TLocal[] {
  const matchBy = opts.matchBy ?? ((item: any) => String(item?.name ?? '').toLowerCase());
  const lookup = new Map<string, TLocal>();
  for (const item of opts.fallbackItems) {
    const key = matchBy(item).toLowerCase();
    if (key) lookup.set(key, item);
  }
  const out: TLocal[] = [];
  for (const r of remote) {
    const k = (r.name || '').toLowerCase();
    const local = lookup.get(k);
    if (local) out.push(local);
  }
  return out;
}

// ── Public API ──
export async function searchCatalogue<TLocal>(
  query: string,
  type: SearchType,
  opts: FallbackOptions<TLocal>,
): Promise<SearchResponse<TLocal>> {
  const trimmed = query.trim();
  if (!trimmed) return localFallback('', opts);

  if (!isApiEnabled()) {
    return localFallback(trimmed, opts);
  }

  const ctrl = abortPrevious(`search:${type}`);
  const t0 = Date.now();

  try {
    const res = await fetch(`${API_BASE}/api/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: trimmed, type, pageSize: opts.pageSize ?? 12 }),
      signal: ctrl.signal,
    });

    if (!res.ok) {
      console.warn(`[search] API returned ${res.status}, falling back to local`);
      return localFallback(trimmed, opts);
    }

    const json: { results: RemoteSearchResult[]; total: number } = await res.json();
    const reconciled = reconcileToLocal(json.results || [], opts);

    // If reconciliation lost everything (e.g. the server has data the local
    // file doesn't), fall back to local matches so the UI never goes empty.
    if (reconciled.length === 0) {
      const fb = localFallback(trimmed, opts);
      return { ...fb, latencyMs: Date.now() - t0 };
    }

    return {
      isRemote: true,
      results: reconciled,
      total: json.total || reconciled.length,
      latencyMs: Date.now() - t0,
    };
  } catch (err: any) {
    // Aborts are not errors — they happen when the user keeps typing.
    if (err?.name === 'AbortError') {
      return { isRemote: false, results: [], total: 0, latencyMs: Date.now() - t0 };
    }
    console.warn('[search] API call failed, falling back to local:', err?.message || err);
    return localFallback(trimmed, opts);
  }
}
