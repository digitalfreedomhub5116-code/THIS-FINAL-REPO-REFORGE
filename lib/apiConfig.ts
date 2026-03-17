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
