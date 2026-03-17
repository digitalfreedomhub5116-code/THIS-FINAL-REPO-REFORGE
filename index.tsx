import React from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleOAuthProvider } from '@react-oauth/google';
import './index.css';
import App from './App';
import { initGoogleAuth } from './lib/googleAuth';

// Initialize native Google Sign-In for Capacitor (no-op on web)
initGoogleAuth();

const runtimeConfig = (window as any).__REFORGE_CONFIG__ || {};
const GOOGLE_CLIENT_ID =
  runtimeConfig.googleClientId ||
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  '';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <App />
    </GoogleOAuthProvider>
  </React.StrictMode>
);