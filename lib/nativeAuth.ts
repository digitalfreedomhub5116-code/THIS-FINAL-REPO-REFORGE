/**
 * Native Auth Persistence Layer
 * 
 * Uses @capacitor/preferences (native key-value storage) to persist auth tokens
 * independently of the WebView's localStorage. This ensures the user stays logged in
 * even when Android kills the app process from the recents screen.
 * 
 * Flow:
 *  - On login: save token + userId to both localStorage AND Preferences
 *  - On startup: if localStorage is empty, restore from Preferences
 *  - On logout: clear both localStorage AND Preferences
 */

import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

const KEY_TOKEN = 'reforge_player_token';
const KEY_USER_ID = 'reforge_user_id';

const isNative = Capacitor.isNativePlatform();

// Extract userId from a JWT token payload (no verification, just decode)
function extractUserIdFromToken(token: string): string | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(decodeURIComponent(atob(base64).split('').map(c =>
      '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
    ).join('')));
    return payload.sub || payload.userId || payload.supabase_id || payload.id || null;
  } catch { return null; }
}

// ── Save auth to native storage (call after successful login) ──
// userId is optional — if omitted, it is extracted from the JWT token.
export async function saveAuthNative(token: string, userId?: string): Promise<void> {
  const uid = userId || extractUserIdFromToken(token) || '';
  // Always write to localStorage (used by the rest of the app)
  localStorage.setItem(KEY_TOKEN, token);
  if (uid) localStorage.setItem(KEY_USER_ID, uid);

  if (isNative) {
    try {
      await Preferences.set({ key: KEY_TOKEN, value: token });
      await Preferences.set({ key: KEY_USER_ID, value: uid });
    } catch (err) {
      console.warn('[NativeAuth] Failed to save to Preferences:', err);
    }
  }
}

// ── Restore auth from native storage into localStorage (call on app startup) ──
// Returns true if auth was restored, false if no saved auth exists.
export async function restoreAuthFromNative(): Promise<boolean> {
  if (!isNative) return false;

  try {
    // If localStorage already has the token, nothing to restore
    const existingToken = localStorage.getItem(KEY_TOKEN);
    if (existingToken) return true;

    // localStorage is empty — try to restore from native Preferences
    const { value: savedToken } = await Preferences.get({ key: KEY_TOKEN });
    const { value: savedUserId } = await Preferences.get({ key: KEY_USER_ID });

    if (savedToken && savedUserId) {
      localStorage.setItem(KEY_TOKEN, savedToken);
      localStorage.setItem(KEY_USER_ID, savedUserId);
      console.log('[NativeAuth] Restored auth from native storage');
      return true;
    }
  } catch (err) {
    console.warn('[NativeAuth] Failed to restore from Preferences:', err);
  }

  return false;
}

// ── Clear auth from both localStorage and native storage (call on logout) ──
export async function clearAuthNative(): Promise<void> {
  localStorage.removeItem(KEY_TOKEN);
  localStorage.removeItem(KEY_USER_ID);

  if (isNative) {
    try {
      await Preferences.remove({ key: KEY_TOKEN });
      await Preferences.remove({ key: KEY_USER_ID });
    } catch (err) {
      console.warn('[NativeAuth] Failed to clear Preferences:', err);
    }
  }
}
