import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: [
      'services/__tests__/**/*.test.js',
      'routes/__tests__/**/*.test.js',
      'utils/__tests__/**/*.test.js'
    ],
    globals: true,
    reporters: ['default'],
    coverage: {
      reporter: ['text', 'html'],
      include: ['services/**/*.js', 'routes/**/*.js'],
      exclude: ['services/__tests__/**', 'routes/__tests__/**']
    }
  }
});


