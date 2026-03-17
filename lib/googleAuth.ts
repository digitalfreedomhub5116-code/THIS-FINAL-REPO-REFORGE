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
 * Returns the Google ID token (credential) string, or null on failure.
 */
export async function nativeGoogleSignIn(): Promise<string | null> {
  if (!isCapacitor || !GoogleAuth) return null;
  try {
    const user = await GoogleAuth.signIn();
    // The plugin returns authentication.idToken which is the same credential
    // that @react-oauth/google returns via credentialResponse.credential
    const idToken = user?.authentication?.idToken;
    if (!idToken) {
      console.error('[GoogleAuth] No idToken in native sign-in response:', user);
      return null;
    }
    return idToken;
  } catch (err) {
    console.error('[GoogleAuth] Native sign-in error:', err);
    return null;
  }
}

/**
 * Whether we're running on a native Capacitor platform.
 * Used by auth components to decide whether to show native button or web GoogleLogin.
 */
export const isNativePlatform = isCapacitor;
