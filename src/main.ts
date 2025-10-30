import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './style.css'
import App from './App.vue'

const app = createApp(App)
app.use(createPinia())
app.mount('#app')

// Remove initial splash overlay after app mounts
try {
  const splash = document.getElementById('initial-splash')
  if (splash && splash.parentNode) splash.parentNode.removeChild(splash)
} catch {}
