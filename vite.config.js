import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
    target: 'es2020',
    minify: false,
    rollupOptions: {
      output: {
        // Put everything in one chunk to avoid module loading order issues
        manualChunks: () => 'index'
      }
    }
  },
  resolve: {
    dedupe: ['react', 'react-dom', '@emotion/react', '@emotion/styled']
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'prop-types',
      '@emotion/react',
      '@emotion/styled',
      '@emotion/cache',
      '@mui/material',
      '@mui/icons-material',
      '@mui/x-date-pickers'
    ]
  },
  define: {
    global: 'globalThis',
  },
  envPrefix: 'VITE_'
})