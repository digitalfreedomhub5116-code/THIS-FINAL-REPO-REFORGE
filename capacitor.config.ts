import type { CapacitorConfig } from '@capacitor/cli';

const deployedUrl = process.env.DEPLOYED_URL;

const config: CapacitorConfig = {
  appId: 'com.reforge.app',
  appName: 'REFORGE',
  webDir: 'dist',
  ...(deployedUrl && {
    server: {
      url: deployedUrl,
      cleartext: false,
    },
  }),
  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email'],
      // The Web Client ID goes in serverClientId (this is what the backend expects in the `aud` field)
      serverClientId: '20910572316-81krg6ag9ajbnvde8pu862rrc6pglp45.apps.googleusercontent.com',
      // The Android Client ID you just created goes here
      androidClientId: '20910572316-5ofu2hcterdiov6q9f1h2373ddkqnpbg.apps.googleusercontent.com',
      forceCodeForRefreshToken: true,
    },
  },
};

export default config;
