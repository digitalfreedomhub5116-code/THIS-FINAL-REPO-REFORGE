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
};

export default config;
