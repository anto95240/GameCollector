import react from '@vitejs/plugin-react'
import path from 'path'
import { defineConfig } from 'vite'

import packageJson from './package.json'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    }
  },
  define: {
    // Crée une variable globale avec la version
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(packageJson.version)
  }
})
