import { Capacitor } from '@capacitor/core';

/**
 * API Base URL Configuration
 * 
 * In development (browser): API calls go to the same origin via Vite proxy → ''
 * In production APK (Capacitor native): API calls go to the Railway server
 * In production web (Railway): API calls go to the same origin → ''
 */

const isNativePlatform = Capacitor.isNativePlatform();

// When running inside a native APK, point API calls to the Railway server.
// When running in a browser, use relative URLs (same origin).
export const API_BASE = isNativePlatform
  ? 'https://this-final-repo-reforge-production-2c30.up.railway.app'
  : '';

/**
 * Fetch with automatic retry for transient failures (Railway restarts, Supabase wake-ups).
 *
 * IMPORTANT: Retries are ONLY safe for idempotent methods (GET, HEAD, OPTIONS).
 * For POST/PUT/PATCH/DELETE, retrying after a network timeout can cause the server
 * to process the request twice — creating duplicate accounts, duplicate charges, etc.
 *
 * By default we auto-detect based on the HTTP method:
 *   - GET / HEAD / OPTIONS / no-method  → retries enabled (3x)
 *   - POST / PUT / PATCH / DELETE        → single attempt, no retry
 *
 * Callers can override this by passing `retries` explicitly.
 */
export async function fetchWithRetry(
  input: RequestInfo | URL,
  init?: RequestInit,
  retries?: number,
  delayMs: number = 2000,
  timeoutMs: number = 45000
): Promise<Response> {
  const method = (init?.method || 'GET').toUpperCase();
  const isIdempotent = method === 'GET' || method === 'HEAD' || method === 'OPTIONS';
  const effectiveRetries = retries !== undefined ? retries : (isIdempotent ? 3 : 0);

  let lastError: any;
  for (let attempt = 0; attempt <= effectiveRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      const res = await fetch(input, { ...init, signal: controller.signal });
      clearTimeout(timer);
      return res;
    } catch (err) {
      lastError = err;
      if (attempt < effectiveRetries) {
        await new Promise(r => setTimeout(r, delayMs));
      }
    }
  }
  throw lastError;
}

/**
 * Server reachability check. Returns true if /health responds within 30s.
 * Generous timeout to accommodate Railway cold starts (can take 30-40s).
 */
export async function checkServerHealth(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    const res = await fetch(`${API_BASE}/health`, { signal: controller.signal });
    clearTimeout(timeout);
    return res.ok;
  } catch {
    return false;
  }
}
