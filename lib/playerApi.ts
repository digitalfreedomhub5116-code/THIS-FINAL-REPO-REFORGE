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
 * If none in localStorage, hits both whoami endpoints to get a fresh one.
 * Returns auth headers with the token, or {} if all attempts fail.
 */
export async function getOrRefreshPlayerHeaders(apiBase: string): Promise<Record<string, string>> {
  const existing = localStorage.getItem('reforge_player_token');
  if (existing) return { Authorization: `Bearer ${existing}` };

  // Try to refresh from server whoami endpoints
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
