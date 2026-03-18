import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mergeConfig, defineProject } from 'vitest/config';
import sharedConfig from '../../vitest.shared.mts';

const CURRENT_DIR = dirname(fileURLToPath(import.meta.url));

export default mergeConfig(
  sharedConfig,
  defineProject({
    define: {
      'process.env.NODE_ENV': JSON.stringify('test'),
    },
    resolve: {
      alias: {
        '@base-ui/lit': resolve(CURRENT_DIR, './src'),
        '@base-ui/utils': resolve(CURRENT_DIR, '../utils/src'),
      },
    },
  }),
);
