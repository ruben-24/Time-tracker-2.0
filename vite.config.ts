import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { readFileSync } from 'fs'

// Read version from package.json
const packageJson = JSON.parse(readFileSync('./package.json', 'utf-8'))
const appVersion = packageJson.version

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  // Ensure relative asset paths so CSS loads in Capacitor WebView and static hosting
  base: './',
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
  },
})
