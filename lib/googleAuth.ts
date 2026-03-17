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
    const msg = err?.message || '';
    const code = err?.code || err?.statusCode || '';
    const fullErr = `${msg} [code: ${code}]`;
    console.error('[GoogleAuth] Native sign-in error:', fullErr, JSON.stringify(err));
    // Capacitor plugin puts status code in err.code
    const codeStr = String(code);
    if (codeStr === '12501' || msg.includes('canceled') || msg.includes('cancelled')) {
      return { error: 'Sign-in was cancelled' };
    }
    if (codeStr === '10' || msg.includes('DEVELOPER_ERROR')) {
      return { error: 'SHA-1 fingerprint mismatch (error 10). Verify your SHA-1 and package name in Google Cloud Console match your debug keystore.' };
    }
    if (codeStr === '12500') {
      return { error: 'Google Sign-In failed (error 12500). Check Google Play Services on your device.' };
    }
    if (codeStr === '7') {
      return { error: 'Network error (code 7). Check your internet connection.' };
    }
    return { error: fullErr || 'Unknown Google sign-in error' };
  }
}

/**
 * Whether we're running on a native Capacitor platform.
 * Used by auth components to decide whether to show native button or web GoogleLogin.
 */
export const isNativePlatform = isCapacitor;
