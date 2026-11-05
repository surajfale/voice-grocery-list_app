import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'robots.txt', 'apple-touch-icon.png'],
      manifest: {
        name: 'Grocery List - Smart Voice Shopping Lists',
        short_name: 'Grocery List',
        description: 'AI-powered voice grocery list with smart categorization and auto-correction',
        theme_color: '#fafafa',
        background_color: '#fafafa',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ],
        categories: ['productivity', 'shopping', 'utilities'],
        // Long-press the app icon (Android). Handled in App.jsx (?action=)
        shortcuts: [
          {
            name: 'Today\'s List',
            short_name: 'Today',
            description: 'Open today\'s grocery list',
            url: '/',
            icons: [{ src: 'pwa-192x192.png', sizes: '192x192' }]
          },
          {
            name: 'Add by voice',
            short_name: 'Voice',
            description: 'Open today\'s list and start listening',
            url: '/?action=voice',
            icons: [{ src: 'pwa-192x192.png', sizes: '192x192' }]
          },
          {
            name: 'Scan a receipt',
            short_name: 'Receipt',
            description: 'Open Receipts to upload a receipt photo',
            url: '/?action=receipts',
            icons: [{ src: 'pwa-192x192.png', sizes: '192x192' }]
          }
        ],
        // Share → Grocery List from Camera/Photos uploads the receipt.
        // public/share-target-sw.js receives the POST
        share_target: {
          action: '/share-receipt',
          method: 'POST',
          enctype: 'multipart/form-data',
          params: {
            files: [{ name: 'receipts', accept: ['image/*'] }]
          }
        }
      },
      workbox: {
        // Share-target POST handler; must answer before Workbox's routes
        importScripts: ['share-target-sw.js'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        runtimeCaching: [
          {
            // Offline fallback for API reads (GET only, Workbox's default).
            // Never cached: auth responses and receipt images. The cache is
            // deleted on logout and when the session ends (src/services/session.js)
            urlPattern: ({ url }) => /\.railway\.app$/i.test(url.hostname)
              && url.pathname.startsWith('/api/')
              && !url.pathname.startsWith('/api/auth/')
              && !url.pathname.endsWith('/image'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              // Only successful responses; never an error page or opaque reply
              cacheableResponse: { statuses: [200] },
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 5 // 5 minutes
              },
              networkTimeoutSeconds: 10
            }
          }
        ]
      },
      devOptions: {
        enabled: false // Enable in dev mode if you want to test PWA features
      }
    })
  ],
  build: {
    outDir: 'dist',
    sourcemap: false,
    target: 'es2020',
    minify: 'terser',
    commonjsOptions: {
      transformMixedEsModules: true,
      include: [/node_modules/],
      defaultIsModuleExports: 'auto'
    },
    rollupOptions: {
      output: {
        manualChunks: undefined
      }
    }
  },
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'prop-types',
      'validator'
    ],
    esbuildOptions: {
      define: {
        global: 'globalThis'
      }
    }
  },
  envPrefix: 'VITE_'
})