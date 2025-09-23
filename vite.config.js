import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react({
    jsxImportSource: '@emotion/react'
  })],
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        // Force emotion to stay together in one chunk
        manualChunks: (id) => {
          if (id.includes('@emotion') || id.includes('emotion')) {
            return 'emotion'
          }
          if (id.includes('@mui/material') || id.includes('@mui/icons-material') || id.includes('@mui/x-date-pickers')) {
            return 'mui'
          }
          if (id.includes('react') && !id.includes('@emotion')) {
            return 'react'
          }
        }
      }
    },
    target: 'es2020',
    minify: false, // Disable minification to debug
    commonjsOptions: {
      include: [/node_modules/],
      transformMixedEsModules: true
    }
  },
  resolve: {
    alias: {
      '@emotion/react': '@emotion/react',
      '@emotion/styled': '@emotion/styled'
    },
    dedupe: ['@emotion/react', '@emotion/styled', '@emotion/cache']
  },
  optimizeDeps: {
    include: [
      '@emotion/react',
      '@emotion/styled',
      '@emotion/cache',
      '@mui/material',
      '@mui/icons-material',
      '@mui/x-date-pickers'
    ],
    force: true
  },
  define: {
    global: 'globalThis',
  },
  envPrefix: 'VITE_'
})