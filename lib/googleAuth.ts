/**
 * Google Auth utility for hybrid Capacitor + Web apps.
 * 
 * - On native (Capacitor APK): Uses @codetrix-studio/capacitor-google-auth for native Google Sign-In
 * - On web (browser): Falls through to the existing @react-oauth/google <GoogleLogin> component
 */

const isCapacitor = typeof (window as any)?.Capacitor !== 'undefined'
  && (window as any)?.Capacitor?.isNativePlatform?.();

let GoogleAuth: any = null;

/**
 * Initialize Google Auth for Capacitor native platform.
 * Call this once on app startup.
 */
export async function initGoogleAuth() {
  if (!isCapacitor) return;
  try {
    const mod = await import('@codetrix-studio/capacitor-google-auth');
    GoogleAuth = mod.GoogleAuth;
    GoogleAuth.initialize({
      clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID,
      scopes: ['profile', 'email'],
      grantOfflineAccess: false,
    });
  } catch (err) {
    console.error('[GoogleAuth] Failed to initialize native Google Auth:', err);
  }
}

/**
 * Perform native Google Sign-In on Capacitor.
 * Returns { idToken } on success, or { error } on failure.
 */
export async function nativeGoogleSignIn(): Promise<{ idToken?: string; error?: string }> {
  if (!isCapacitor || !GoogleAuth) {
    return { error: 'Google Auth not initialized — restart the app' };
  }
  try {
    const user = await GoogleAuth.signIn();
    console.log('[GoogleAuth] signIn raw response:', JSON.stringify(user));
    // The Java plugin puts idToken in two places:
    // 1. user.authentication.idToken
    // 2. user.idToken (top-level)
    const idToken = user?.authentication?.idToken || user?.idToken;
    if (!idToken) {
      return { error: 'No ID token received from Google. Keys: ' + (user ? Object.keys(user).join(',') : 'null') };
    }
    return { idToken };
  } catch (err: any) {
    const msg = err?.message || String(err);
    console.error('[GoogleAuth] Native sign-in error:', msg, err);
    // Surface the actual error for debugging
    if (msg.includes('12501') || msg.includes('canceled')) {
      return { error: 'Sign-in was cancelled' };
    }
    if (msg.includes('10') || msg.includes('DEVELOPER_ERROR')) {
      return { error: 'Config error (code 10): SHA-1 or package name mismatch in Google Cloud Console' };
    }
    return { error: msg };
  }
}

/**
 * Whether we're running on a native Capacitor platform.
 * Used by auth components to decide whether to show native button or web GoogleLogin.
 */
export const isNativePlatform = isCapacitor;
