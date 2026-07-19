/**
 * Compatibility shim over the unified auth module (`lib/auth.ts`).
 *
 * Historically this file owned client-side player auth: header building, a
 * whoami/session-cookie recovery chain, and a bespoke 401-retry `authenticatedFetch`.
 * That logic now lives in `lib/auth.ts` (stateless Bearer JWT + single-flight reissue).
 *
 * This module is kept only so existing importers keep working — it delegates every
 * export straight to `lib/auth.ts`. Prefer importing from `lib/auth` in new code.
 */

import { getAuthHeaders, authFetch } from './auth';

/**
 * Build Authorization headers for player API calls.
 * Delegates to `getAuthHeaders()` in lib/auth.
 */
export function getPlayerAuthHeaders(): Record<string, string> {
  return getAuthHeaders();
}

/**
 * Return current auth headers.
 *
 * Kept for backwards compatibility (the `apiBase` / `forceRefresh` params are no
 * longer used — lib/auth's `authFetch` handles token reissue transparently). Stays
 * async so callers that `await` it keep working.
 */
export async function getOrRefreshPlayerHeaders(
  _apiBase?: string,
  _forceRefresh: boolean = false,
): Promise<Record<string, string>> {
  return Promise.resolve(getAuthHeaders());
}

/**
 * Authenticated fetch wrapper. Delegates to `authFetch()` in lib/auth, which
 * attaches the Bearer token and performs single-flight 401 reissue.
 */
export function authenticatedFetch(
  url: string,
  init?: RequestInit,
): Promise<Response> {
  return authFetch(url, init);
}
