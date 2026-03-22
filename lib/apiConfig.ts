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
  ? 'https://this-final-repo-reforge-production.up.railway.app'
  : '';

/**
 * Fetch with automatic retry for transient failures (Railway restarts, Supabase wake-ups).
 * Retries up to `retries` times with `delayMs` between attempts.
 */
export async function fetchWithRetry(
  input: RequestInfo | URL,
  init?: RequestInit,
  retries: number = 2,
  delayMs: number = 1500
): Promise<Response> {
  let lastError: any;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(input, init);
      return res;
    } catch (err) {
      lastError = err;
      if (attempt < retries) {
        await new Promise(r => setTimeout(r, delayMs));
      }
    }
  }
  throw lastError;
}

/**
 * Quick server reachability check. Returns true if /health responds within 5s.
 */
export async function checkServerHealth(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`${API_BASE}/health`, { signal: controller.signal });
    clearTimeout(timeout);
    return res.ok;
  } catch {
    return false;
  }
}
