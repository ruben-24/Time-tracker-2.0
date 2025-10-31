import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.example.timetracker2',
  appName: 'ChronoFlux',
  webDir: 'dist',
  splashScreen: {
    launchShowDuration: 2000,
    launchAutoHide: true,
    backgroundColor: '#000000',
    showSpinner: false,
    iosSpinnerStyle: 'small',
    spinnerColor: '#ffffff'
  }
};

export default config;
