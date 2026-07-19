/**
 * Shared Login Flow Helpers (JWT-only)
 *
 * Consolidates the login-completion + session-restore logic that used to be
 * duplicated across the three login screens (AuthView, SignInPage,
 * CreateAccountPage). Built on top of the unified `lib/auth.ts` module so token
 * persistence, epoch bumping, and Bearer attachment all live in one place.
 *
 *  - `completeLogin`  — persists a freshly minted token, loads the player row,
 *                       shapes the profile object the app expects, and hands it
 *                       to the screen's `onLogin` prop.
 *  - `tryRestoreSession` — JWT-only replacement for the old cookie/session
 *                       `whoami` auto-login. No `credentials:'include'`, no
 *                       `/api/auth/local/whoami`.
 *
 * The profile-shaping logic is copied verbatim from SignInPage/CreateAccountPage's
 * `loginWithUser` (the richer variant that injects the top-level `avatar_url`
 * column and a Google `profileImageUrl` fallback). AuthView previously used a
 * simpler subset; the richer variant is a superset — routing/onboarding decisions
 * depend only on `raw_data` (specifically `raw_data.isConfigured`), which is
 * unchanged, so behavior is preserved for all three screens.
 */

import { PlayerData, ReplitUser } from '../types';
import { API_BASE } from './apiConfig';
import { login, authFetch, ensureAuthReady, isAuthed, getToken } from './auth';

/** Minimal user shape the screens pass in (ReplitUser-compatible, id required). */
type LoginUser = {
  id: string;
  firstName?: string | null;
  username?: string;
  profileImageUrl?: string | null;
  [k: string]: any;
};

type Profile = Partial<PlayerData> & { replitUser?: ReplitUser };

/**
 * Decode a JWT payload (no signature verification) and extract the user id.
 * Mirrors the claim fallbacks used by nativeAuth.ts (`sub` first).
 */
function decodeUserIdFromToken(token: string): string | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(
      decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join(''),
      ),
    );
    return payload.sub || payload.userId || payload.supabase_id || payload.id || null;
  } catch {
    return null;
  }
}

/**
 * Fetch the player row via `authFetch` (Bearer auto-attached, no cookies) and
 * extract `raw_data`, injecting the top-level `avatar_url` column when present.
 * Returns whether the row was found and the extracted player data.
 */
async function fetchPlayerData(
  userId: string,
): Promise<{ found: boolean; playerData: Partial<PlayerData> | null }> {
  let playerData: Partial<PlayerData> | null = null;
  try {
    const playerRes = await authFetch(`${API_BASE}/api/player/${userId}`);
    if (playerRes.ok) {
      const row = await playerRes.json();
      if (row?.raw_data) {
        playerData = row.raw_data as Partial<PlayerData>;
        // Inject top-level avatar_url column into raw_data so player.avatarUrl gets populated
        if (row.avatar_url && !playerData.avatarUrl) {
          playerData.avatarUrl = row.avatar_url;
        }
      } else if (row?.avatar_url) {
        // No raw_data yet (brand new user) — create minimal raw_data with avatar
        playerData = { avatarUrl: row.avatar_url };
      }
      return { found: true, playerData };
    }
  } catch {
    /* no cloud data yet */
  }
  return { found: false, playerData };
}

/**
 * Build the exact profile object the screens historically passed to `onLogin`.
 * Copied verbatim from SignInPage/CreateAccountPage's `loginWithUser`.
 */
function buildProfile(user: LoginUser, playerData: Partial<PlayerData> | null): Profile {
  // Also check profileImageUrl from Google auth (passed via ReplitUser)
  const avatarFallback = (user as any).profileImageUrl || undefined;
  return {
    id: user.id,
    name: playerData?.name || user.firstName || 'Hunter',
    username: (user as any).username || playerData?.username,
    avatarUrl: playerData?.avatarUrl || avatarFallback,
    raw_data: playerData
      ? { ...playerData, avatarUrl: playerData.avatarUrl || avatarFallback }
      : avatarFallback
        ? { avatarUrl: avatarFallback }
        : undefined,
    replitUser: user as ReplitUser,
  } as any;
}

/**
 * Finish a successful authentication: persist the freshly minted token (which
 * bumps the auth epoch), load the player row, shape the profile, and call
 * `onLogin`. This helper OWNS token persistence — callers must NOT also call
 * `saveAuthNative`.
 */
export async function completeLogin(
  playerToken: string,
  user: LoginUser,
  onLogin: (profile: any) => void,
): Promise<void> {
  await login(playerToken);
  const { playerData } = await fetchPlayerData(user.id);
  onLogin(buildProfile(user, playerData));
}

/**
 * JWT-only auto-login used on screen mount. Replaces the old cookie/session
 * `whoami` flow: it awaits the startup native-restore, checks the local token,
 * decodes the userId, and loads the player row via `authFetch`. On success it
 * calls `onLogin` and returns true; otherwise returns false so the screen shows
 * its normal login UI. It never calls `/api/auth/local/whoami` and never uses
 * `credentials:'include'`.
 */
export async function tryRestoreSession(onLogin: (profile: any) => void): Promise<boolean> {
  await ensureAuthReady();
  if (!isAuthed()) return false;
  const token = getToken();
  if (!token) return false;
  const userId = decodeUserIdFromToken(token);
  if (!userId) return false;
  const { found, playerData } = await fetchPlayerData(userId);
  if (!found) return false;
  onLogin(buildProfile({ id: userId }, playerData));
  return true;
}
