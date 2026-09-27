import { defineConfig } from 'vitest/config';
import path from 'path';

// Standalone from vite.config.js so unit tests don't load the PWA/React plugins
export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, 'src') },
  },
  test: {
    include: ['src/**/*.test.js'],
    environment: 'node',
  },
});
