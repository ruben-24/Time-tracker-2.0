import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.example.timetracker2',
  appName: 'ChronoFlux',
  webDir: 'dist',
  splashScreen: {
    launchShowDuration: 2000,
    launchAutoHide: true,
    backgroundColor: '#000000',
    androidSplashResourceName: 'splash',
    androidScaleType: 'CENTER_CROP',
    showSpinner: false,
    androidSpinnerStyle: 'large',
    iosSpinnerStyle: 'small',
    spinnerColor: '#ffffff',
    splashFullScreen: true,
    splashImmersive: true
  }
};

export default config;
