import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  // Ensure relative asset paths so CSS loads in Capacitor WebView and static hosting
  base: './',
})
