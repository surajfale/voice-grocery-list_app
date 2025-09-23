import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    dedupe: ['@emotion/react', '@emotion/styled']
  },
  optimizeDeps: {
    include: [
      '@mui/material',
      '@mui/icons-material',
      '@emotion/react',
      '@emotion/styled',
      'dayjs'
    ]
  },
  build: {
    // Output directory (must match netlify.toml publish setting)
    outDir: 'dist',
    // Generate source maps for production debugging
    sourcemap: true,
    // Optimize chunks for better caching
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          mui: ['@mui/material', '@mui/icons-material', '@mui/x-date-pickers'],
          emotion: ['@emotion/react', '@emotion/styled'],
          utils: ['dayjs']
        },
        // Better asset naming for caching
        assetFileNames: 'assets/[name]-[hash][extname]',
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js'
      }
    },
    // Increase chunk size warning limit for production
    chunkSizeWarningLimit: 1000,
    // Enable minification
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.logs in production
        drop_debugger: true
      }
    }
  },
  define: {
    global: 'globalThis',
  },
  // Preview/serve configuration
  preview: {
    port: 4173,
    host: true
  },
  // Environment variables prefix
  envPrefix: 'VITE_'
})