import { fileURLToPath, URL } from 'node:url'

import react from '@vitejs/plugin-react'
import { visualizer } from 'rollup-plugin-visualizer'
import { defineConfig } from 'vite'
import analyzer from 'vite-bundle-analyzer'

import packageJson from './package.json'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    mode === 'analyze' && visualizer({
      filename: './dist/stats.html',
      open: true,
      gzipSize: true,
      brotliSize: true,
    }),
    mode === 'analyze' && analyzer()
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  define: {
    // Crée une variable globale avec la version
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(packageJson.version)
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('/react-router/') || id.includes('/react-router-dom/')) {
              return 'vendor-react';
            }
            if (id.includes('chart.js') || id.includes('react-chartjs-2') || id.includes('recharts') || id.includes('react-charts')) {
              return 'vendor-charts';
            }
            if (id.includes('@fortawesome')) {
              return 'vendor-icons';
            }
            if (id.includes('axios') || id.includes('i18next') || id.includes('fuse.js')) {
              return 'vendor-utils';
            }
            return 'vendor-core'; // cache rest of node_modules
          }
        }
      }
    }
  }
}))
