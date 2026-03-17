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
      clientId: '20910572316-81krg6ag9ajbnvde8pu862rrc6pglp45.apps.googleusercontent.com',
      forceCodeForRefreshToken: false,
    },
  },
};

export default config;
