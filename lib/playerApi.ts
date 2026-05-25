import { saveAuthNative } from './nativeAuth';

/**
 * Helper to build Authorization headers for player API calls.
 * Reads the JWT from localStorage (set at login time).
 */
export function getPlayerAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('reforge_player_token');
  if (token) {
    return { Authorization: `Bearer ${token}` };
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

  // Try to refresh from server whoami endpoints (uses Express session cookie).
  const endpoints = [
    `${apiBase}/api/auth/local/whoami`,
    `${apiBase}/api/auth/whoami`,
  ];
  for (const url of endpoints) {
    try {
      const res = await fetch(url, { credentials: 'include' });
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
