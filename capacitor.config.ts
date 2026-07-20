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
      clientId: '20910572316-t603mbpnpddklbncvj41fs99818gf3ej.apps.googleusercontent.com',
      androidClientId: '20910572316-ceq6sh3fi0182skvhv0035vtsuut61ul.apps.googleusercontent.com',
      forceCodeForRefreshToken: false,
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_notification',
      iconColor: '#00d2ff',
      sound: 'default',
    },
    AdMob: {
      appMeasurementServiceEnabled: true,
    },
  },
};

export default config;
