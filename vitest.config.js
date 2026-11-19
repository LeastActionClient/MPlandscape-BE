import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 30000,
    hookTimeout: 120000,
    fileParallelism: false, // Run test suites sequentially to share in-memory binary cleanly
    maxWorkers: 1,
    minWorkers: 1,
  },
});
