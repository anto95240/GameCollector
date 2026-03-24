import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import packageJson from './package.json'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // Crée une variable globale avec la version
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(packageJson.version)
  }
})
