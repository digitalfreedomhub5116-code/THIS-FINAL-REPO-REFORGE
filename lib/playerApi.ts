import { saveAuthNative, getTokenFromNative } from './nativeAuth';
import { API_BASE } from './apiConfig';

// Module-level cache — survives localStorage clears during session
let _cachedToken: string | null = null;
/**
 * Helper to build Authorization headers for player API calls.
 * Reads the JWT from localStorage, falls back to module-level cache.
 */
export function getPlayerAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('reforge_player_token');
  if (token) {
    _cachedToken = token; // keep a backup
    return { Authorization: `Bearer ${token}` };
  }
  // Fallback: if localStorage was cleared mid-session, use cached token
  if (_cachedToken) {
    // Restore to localStorage
    localStorage.setItem('reforge_player_token', _cachedToken);
    console.warn('[PlayerApi] localStorage was empty, restored from module cache');
    return { Authorization: `Bearer ${_cachedToken}` };
  }
  return {};
}

/**
 * Tries to return a valid player token.
 *
 * Default behaviour: returns the existing token from localStorage if one is present;
 * only hits the server's whoami endpoints when localStorage is empty.
 *
 * Pass `forceRefresh = true` when a previous request returned 401 — that bypasses the
 * localStorage cache and asks the server to mint a fresh JWT (using the Express session
 * cookie as the credential). This is the recovery path for expired tokens and rotated
 * JWT_SECRET.
 *
 * Returns auth headers with the token, or {} if all attempts fail (caller should treat
 * an empty result as "session is dead — prompt the user to sign in again").
 */
export async function getOrRefreshPlayerHeaders(
  apiBase: string,
  forceRefresh: boolean = false,
): Promise<Record<string, string>> {
  if (!forceRefresh) {
    const existing = localStorage.getItem('reforge_player_token');
    if (existing) return { Authorization: `Bearer ${existing}` };
  }

  // ── Fallback 1: Try native Preferences (Android app process was killed) ──
  try {
    const nativeToken = await getTokenFromNative();
    if (nativeToken && !forceRefresh) {
      return { Authorization: `Bearer ${nativeToken}` };
    }
  } catch { /* continue */ }

  // ── Fallback 2: Try server whoami endpoints (uses Express session cookie). ──
  const endpoints = [
    `${apiBase}/api/auth/local/whoami`,
    `${apiBase}/api/auth/whoami`,
  ];
  for (const url of endpoints) {
    try {
      const res = await fetch(url, {
        credentials: 'include',
        headers: { ...getPlayerAuthHeaders() },
      });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.playerToken) {
          saveAuthNative(data.playerToken);
          return { Authorization: `Bearer ${data.playerToken}` };
        }
      }
    } catch { /* try next */ }
  }
  return {};
}

/**
 * Authenticated fetch wrapper with automatic 401 retry.
 *
 * 1. Attaches JWT from localStorage (or native Preferences as fallback).
 * 2. On 401, tries to refresh the token once and retries the request.
 * 3. On second 401, gives up (session truly dead).
 *
 * Usage:
 *   const res = await authenticatedFetch(`${API_BASE}/api/dusk/chat`, {
 *     method: 'POST',
 *     body: JSON.stringify(payload),
 *   });
 */
export async function authenticatedFetch(
  url: string,
  init?: RequestInit,
): Promise<Response> {
  // Build headers — merge auth headers with any caller-provided headers
  const buildHeaders = (extraAuth?: Record<string, string>) => {
    const h = new Headers(init?.headers);
    const auth = extraAuth || getPlayerAuthHeaders();
    if (auth.Authorization && !h.has('Authorization')) {
      h.set('Authorization', auth.Authorization);
    }
    return h;
  };

  // First attempt
  const headers = buildHeaders();
  const res = await fetch(url, { ...init, headers, credentials: 'include' });

  if (res.status !== 401) return res;

  // 401 — try to refresh the token
  console.warn('[authenticatedFetch] 401 received, attempting token refresh...');

  // Strategy 1: Try native Preferences (fast, no network — handles localStorage clear)
  try {
    const nativeToken = await getTokenFromNative();
    if (nativeToken) {
      const retryHeaders = buildHeaders({ Authorization: `Bearer ${nativeToken}` });
      const retryRes = await fetch(url, { ...init, headers: retryHeaders, credentials: 'include' });
      if (retryRes.status !== 401) return retryRes;
    }
  } catch { /* continue */ }

  // Strategy 2: Use the /refresh-token endpoint (works without cookies — the fix for Android)
  try {
    const currentHeaders = getPlayerAuthHeaders();
    if (currentHeaders.Authorization) {
      const refreshRes = await fetch(`${API_BASE}/api/auth/local/refresh-token`, {
        method: 'POST',
        headers: { ...currentHeaders },
      });
      if (refreshRes.ok) {
        const refreshData = await refreshRes.json();
        if (refreshData.playerToken) {
          saveAuthNative(refreshData.playerToken);
          _cachedToken = refreshData.playerToken;
          const retryHeaders = buildHeaders({ Authorization: `Bearer ${refreshData.playerToken}` });
          const retryRes = await fetch(url, { ...init, headers: retryHeaders, credentials: 'include' });
          if (retryRes.status !== 401) return retryRes;
        }
      }
    }
  } catch { /* continue */ }

  // Strategy 3: Try server-side refresh via whoami (session cookie dependent — last resort)
  const refreshed = await getOrRefreshPlayerHeaders(API_BASE, true);
  if (refreshed.Authorization) {
    const retryHeaders = buildHeaders(refreshed);
    const retryRes = await fetch(url, { ...init, headers: retryHeaders, credentials: 'include' });
    return retryRes; // Return regardless — if still 401, session is truly dead
  }

  // All refresh attempts failed — return original 401
  return res;
}
