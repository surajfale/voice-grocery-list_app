import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Simple config that should work with emotion
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: false,
    target: 'esnext',
    rollupOptions: {
      output: {
        format: 'es',
        // Don't split chunks - keep everything together
        manualChunks: () => 'index'
      }
    }
  },
  envPrefix: 'VITE_'
})