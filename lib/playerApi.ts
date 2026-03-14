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
