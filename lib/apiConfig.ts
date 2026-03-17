/**
 * API Base URL Configuration
 * 
 * In development (browser): API calls go to the same origin via Vite proxy → ''
 * In production APK (Capacitor): API calls go to the Railway server → full URL
 * In production web (Railway): API calls go to the same origin → ''
 */

const isCapacitor = typeof (window as any)?.Capacitor !== 'undefined' 
  && (window as any)?.Capacitor?.isNativePlatform?.();

// When running inside a Capacitor APK, point API calls to the Railway server.
// When running in a browser (dev or Railway-hosted), use relative URLs (same origin).
export const API_BASE = isCapacitor
  ? (import.meta.env.VITE_API_BASE_URL || 'https://this-final-repo-reforge-production.up.railway.app')
  : '';
