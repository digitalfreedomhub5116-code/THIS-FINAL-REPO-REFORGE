/**
 * Unified Client Auth Module (JWT-only, Bearer)
 *
 * The single source of truth for client-side authentication. Every authenticated
 * request goes through `authFetch` so no call can accidentally bypass auth, and
 * login/logout are centralized here instead of being duplicated across the three
 * login screens.
 *
 * Design highlights:
 *  - Stateless Bearer JWT (no session cookie). Token lives in localStorage +
 *    Capacitor Preferences (via nativeAuth.ts) so it survives an Android process kill.
 *  - Startup hard-gate: the token is restored from native storage exactly once
 *    (memoized) before the first authenticated request.
 *  - Single-flight 401 reissue: many concurrent 401s share ONE reissue attempt,
 *    then retry the original request once.
 *  - Auth epoch: login/logout abort in-flight requests so a stale response from a
 *    previous account can never land after a switch (prevents cross-account writes).
 *
 * Framework-agnostic — no React imports.
 */

import { saveAuthNative, clearAuthNative, restoreAuthFromNative } from './nativeAuth';
import { API_BASE } from './apiConfig';

const TOKEN_KEY = 'reforge_player_token';

// ── Module-level state ──────────────────────────────────────────────────────

// Backup of the token that survives a mid-session localStorage clear.
let _cachedToken: string | null = null;

// Auth epoch: bumped on login/logout. `authController` is aborted on each bump so
// any request tied to a superseded epoch is cancelled.
let authEpoch = 0;
let authController = new AbortController();

// Single-flight reissue: all concurrent 401s await the same promise.
let reissuePromise: Promise<string | null> | null = null;

// Memoized native-restore promise so `ensureAuthReady` runs the restore once.
let restorePromise: Promise<void> | null = null;

/**
 * Increment the auth epoch, abort every request tied to the current epoch, and
 * install a fresh AbortController for the next epoch. Called on login and logout.
 */
function bumpEpoch(): void {
  authEpoch++;
  try {
    authController.abort();
  } catch {
    /* aborting an already-aborted controller is a no-op */
  }
  authController = new AbortController();
}

// ── Token access ────────────────────────────────────────────────────────────

/**
 * Read the current Bearer token. Falls back to the module-level cache if
 * localStorage was cleared mid-session (and restores it), mirroring the old
 * `getPlayerAuthHeaders` behavior.
 */
export function getToken(): string | null {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    _cachedToken = token; // keep a backup
    return token;
  }
  if (_cachedToken) {
    // localStorage was emptied mid-session — restore from the in-memory cache.
    localStorage.setItem(TOKEN_KEY, _cachedToken);
    return _cachedToken;
  }
  return null;
}

/**
 * Convenience for callers that need to spread auth into a headers object.
 * Returns `{ Authorization: 'Bearer ...' }` or `{}` — mirrors the old
 * `getPlayerAuthHeaders`.
 */
export function getAuthHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Decode a JWT payload without verifying the signature. Returns the parsed
 * payload object, or null if the token can't be decoded.
 */
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join(''),
    );
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * True if a token exists and its JWT `exp` claim is in the future. Decodes
 * defensively: if the token can't be decoded (or has no numeric `exp`), presence
 * of a token is treated as authed — the server will reject it if it's actually bad.
 */
export function isAuthed(): boolean {
  const token = getToken();
  if (!token) return false;
  const payload = decodeJwtPayload(token);
  if (!payload || typeof payload.exp !== 'number') {
    // Can't decode / no expiry claim — assume authed; server is the real gate.
    return true;
  }
  return payload.exp * 1000 > Date.now();
}

// ── Login / logout ──────────────────────────────────────────────────────────

/**
 * Persist a freshly minted token (localStorage + native storage), update the
 * in-memory cache, and bump the auth epoch so any in-flight request from a prior
 * epoch is cancelled.
 */
export async function login(token: string, userId?: string): Promise<void> {
  await saveAuthNative(token, userId);
  _cachedToken = token;
  bumpEpoch();
}

/**
 * Fully clear the session: abort in-flight requests (via the epoch bump), clear
 * localStorage + native storage, and drop the in-memory cache. No stale identity
 * or cross-account data can leak after this resolves.
 */
export async function logout(): Promise<void> {
  bumpEpoch(); // abort any in-flight authed requests tied to the old epoch
  _cachedToken = null;
  await clearAuthNative();
}

// ── Startup gate ──────────────────────────────────────────────────────────────

/**
 * Restore the token from native storage exactly once (the promise is memoized).
 * Safe to call any number of times — the underlying restore runs only on the first
 * call. Awaited by `authFetch` so the token is loaded before the first authed request.
 */
export function ensureAuthReady(): Promise<void> {
  if (!restorePromise) {
    restorePromise = restoreAuthFromNative()
      .then(() => {
        /* discard the boolean result — we only care that restore finished */
      })
      .catch(() => {
        /* restore failures are non-fatal: getToken() falls back to localStorage */
      });
  }
  return restorePromise;
}

// ── Fetch wrapper ─────────────────────────────────────────────────────────────

/**
 * Merge multiple abort signals into one. The returned signal aborts as soon as any
 * input signal fires — used to tie a request to BOTH the current auth epoch and any
 * caller-supplied signal.
 */
function mergeSignals(signals: Array<AbortSignal | undefined | null>): AbortSignal {
  const controller = new AbortController();
  const onAbort = () => controller.abort();
  for (const sig of signals) {
    if (!sig) continue;
    if (sig.aborted) {
      controller.abort();
      break;
    }
    sig.addEventListener('abort', onAbort, { once: true });
  }
  return controller.signal;
}

/**
 * Normalize `RequestInit.headers` (Headers | array | record) into a plain record,
 * then attach `Authorization: Bearer <token>` unless the caller already set one.
 */
function buildHeaders(init: RequestInit | undefined, bearer: string | null): Record<string, string> {
  const h: Record<string, string> = {};
  if (init?.headers) {
    if (init.headers instanceof Headers) {
      init.headers.forEach((value, key) => {
        h[key] = value;
      });
    } else if (Array.isArray(init.headers)) {
      for (const [key, value] of init.headers) h[key] = value;
    } else {
      for (const [key, value] of Object.entries(init.headers)) h[key] = String(value);
    }
  }
  if (bearer) {
    const hasAuth = Object.keys(h).some((k) => k.toLowerCase() === 'authorization');
    if (!hasAuth) h['Authorization'] = `Bearer ${bearer}`;
  }
  return h;
}

/**
 * Single-flight token reissue. The first 401 starts a reissue against
 * `POST /api/auth/reissue` using the current Bearer token; every concurrent 401
 * awaits the same promise. Resolves to the fresh token on success, or null on any
 * failure. The in-flight promise is cleared once settled.
 */
function reissueToken(): Promise<string | null> {
  if (reissuePromise) return reissuePromise;

  reissuePromise = (async (): Promise<string | null> => {
    const token = getToken();
    if (!token) return null;
    try {
      const res = await fetch(`${API_BASE}/api/auth/reissue`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return null;
      const data = (await res.json().catch(() => ({}))) as { playerToken?: unknown };
      const fresh = data.playerToken;
      if (typeof fresh === 'string' && fresh) {
        await login(fresh); // persist + update cache + bump epoch
        return fresh;
      }
      return null;
    } catch {
      return null;
    }
  })().finally(() => {
    reissuePromise = null;
  });

  return reissuePromise;
}

/**
 * The single authenticated fetch wrapper.
 *
 *  1. Awaits `ensureAuthReady()` (startup hard-gate) so the token is loaded.
 *  2. Attaches the Bearer token (unless the caller already set Authorization).
 *  3. Ties the request to the current auth epoch AND any caller signal so a
 *     login/logout aborts it.
 *  4. On 401, performs a single-flight reissue; if it yields a new token, retries
 *     the original request ONCE with the new Bearer and returns that response.
 *  5. If reissue fails, dispatches `reforge:session-expired` and returns the
 *     original 401 — never loops.
 */
export async function authFetch(url: string, init?: RequestInit): Promise<Response> {
  await ensureAuthReady();

  const res = await fetch(url, {
    ...init,
    headers: buildHeaders(init, getToken()),
    signal: mergeSignals([authController.signal, init?.signal]),
  });

  if (res.status !== 401) return res;

  // 401 — attempt exactly one deterministic recovery via single-flight reissue.
  const newToken = await reissueToken();

  if (newToken) {
    // Retry the ORIGINAL request once with the fresh token. Note: login() bumped
    // the epoch, so we read the current (post-reissue) authController signal here.
    return fetch(url, {
      ...init,
      headers: buildHeaders(init, newToken),
      signal: mergeSignals([authController.signal, init?.signal]),
    });
  }

  // Recovery failed — surface a global "session expired" state and stop. No loop.
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('reforge:session-expired'));
  }
  return res;
}
