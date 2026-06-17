import { fileURLToPath, URL } from 'node:url'

import react from '@vitejs/plugin-react'
import { visualizer } from 'rollup-plugin-visualizer'
import { defineConfig } from 'vite'
import analyzer from 'vite-bundle-analyzer'
import { VitePWA } from 'vite-plugin-pwa'

import packageJson from './package.json'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['logo.png', 'icon-192x192.png', 'icon-512x512.png'],
      manifest: {
        name: 'GameCollector',
        short_name: 'GC',
        description: 'Gérez votre collection de jeux vidéo.',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        icons: [
          {
            src: 'icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      devOptions: {
        enabled: true,
      },
    }),
    mode === 'analyze' &&
      visualizer({
        filename: './dist/stats.html',
        open: true,
        gzipSize: true,
        brotliSize: true,
        template: 'treemap',
      }),
    mode === 'analyze' && analyzer({ analyzerMode: 'static' }),
  ].filter(Boolean),
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  define: {
    // Crée une variable globale avec la version
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(packageJson.version),
  },
  build: {
    // Minification avancée via esbuild (défaut Vite) — ultra rapide
    minify: 'esbuild',
    // Cibler des navigateurs modernes pour des bundles plus petits
    target: 'es2020',
    // Seuil d'avertissement pour les gros chunks (600 kB)
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        // Nommage des assets avec hash pour le cache busting
        assetFileNames: 'assets/[name]-[hash][extname]',
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // React core — chargé en premier
            if (
              id.includes('/react/') ||
              id.includes('/react-dom/') ||
              id.includes('/scheduler/')
            ) {
              return 'vendor-react'
            }
            // Routing
            if (id.includes('/react-router/') || id.includes('/react-router-dom/')) {
              return 'vendor-router'
            }
            // Charts — recharts uniquement (chart.js supprimé)
            if (id.includes('/recharts/') || id.includes('/d3-') || id.includes('/victory-')) {
              return 'vendor-charts'
            }
            // Icônes FontAwesome — souvent volumineux
            if (id.includes('@fortawesome')) {
              return 'vendor-icons'
            }
            // Internationalisation
            if (id.includes('/i18next') || id.includes('/react-i18next/')) {
              return 'vendor-i18n'
            }
            if (id.includes('/fuse.js/')) {
              return 'vendor-utils'
            }
            // Virtualisation listes
            if (id.includes('/react-window/')) {
              return 'vendor-virtual'
            }
            // Tout le reste de node_modules
            return 'vendor-core'
          }
        },
      },
      // Supprimer les console.log en production
      ...(mode === 'production' && {
        treeshake: {
          moduleSideEffects: false,
        },
      }),
    },
  },
  // Optimisation des dépendances en dev
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router', 'recharts'],
  },
}))
