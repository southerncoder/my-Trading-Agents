import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    // Database tests each create and drop their own schema; run files one after another to keep
    // connection counts low on the shared local Postgres.
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 30000,
  },
})
