import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 60000,
    hookTimeout: 15000,
    teardownTimeout: 15000,
    include: ['tests/integration/**/*.test.ts'],
    setupFiles: ['tests/setup.ts'],
    // Run integration tests sequentially to avoid rate limiting
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true
      }
    }
  },
  resolve: {
    alias: {
      '@': new URL('./src', import.meta.url).pathname
    }
  }
});