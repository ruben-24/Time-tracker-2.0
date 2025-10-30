import { createApp } from 'vue'
import { SplashScreen } from '@capacitor/splash-screen'
import { createPinia } from 'pinia'
import './style.css'
import App from './App.vue'

try { SplashScreen.hide() } catch {}
const app = createApp(App)
app.use(createPinia())
app.mount('#app')

// Remove initial splash overlay after app mounts
try {
  const splash = document.getElementById('initial-splash')
  if (splash && splash.parentNode) splash.parentNode.removeChild(splash)
} catch {}
