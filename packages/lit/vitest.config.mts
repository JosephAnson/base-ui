import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const CURRENT_DIR = dirname(fileURLToPath(import.meta.url));
const WORKSPACE_ROOT = resolve(CURRENT_DIR, '../../');

const environment = process.env.VITEST_ENV;

export default defineConfig({
  test: {
    exclude: ['node_modules', 'build', '**/*.spec.*'],
    globals: true,
    setupFiles: [resolve(CURRENT_DIR, './test/setupVitest.ts')],
    environment: 'jsdom',
    environmentOptions: {
      jsdom: {
        pretendToBeVisual: true,
        url: 'http://localhost',
      },
    },
    env: {
      VITEST: 'true',
    },
    retry: process.env.CI ? 1 : 0,
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify('test'),
  },
  resolve: {
    alias: {
      '@base-ui/lit': resolve(CURRENT_DIR, './src'),
      '@base-ui/utils': resolve(CURRENT_DIR, '../utils/src'),
    },
  },
});
