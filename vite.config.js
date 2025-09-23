import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: undefined, // Let Vite handle chunking automatically
      }
    },
    target: 'es2015',
    minify: 'esbuild'
  },
  resolve: {
    dedupe: ['@emotion/react', '@emotion/styled', 'react', 'react-dom']
  },
  optimizeDeps: {
    include: [
      '@emotion/react',
      '@emotion/styled',
      '@mui/material',
      '@mui/icons-material'
    ]
  },
  define: {
    global: 'globalThis',
  },
  envPrefix: 'VITE_'
})