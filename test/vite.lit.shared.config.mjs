import * as path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const shouldDisableWorkspaceAliases = Boolean(process.env.MUI_DISABLE_WORKSPACE_ALIASES);

export default defineConfig({
  mode: process.env.NODE_ENV || 'development',
  plugins: [react()],
  resolve: {
    alias: {
      ...(shouldDisableWorkspaceAliases
        ? {
            '@base-ui/react/calendar': path.join(process.cwd(), 'packages/react/src/calendar'),
            '@base-ui/react/localization-provider': path.join(
              process.cwd(),
              'packages/react/src/localization-provider',
            ),
          }
        : {
            '@base-ui/lit': path.join(process.cwd(), 'packages/lit/src'),
            '@base-ui/react': path.join(process.cwd(), 'packages/react/src'),
            '@base-ui/utils': path.join(process.cwd(), 'packages/utils/src'),
            lit: path.join(process.cwd(), 'packages/lit/node_modules/lit'),
          }),
      './fonts': path.join(process.cwd(), '/docs/src/css/fonts'),
      docs: path.join(process.cwd(), '/docs'),
      stream: null,
      zlib: null,
    },
  },
  build: { outDir: 'build', chunkSizeWarningLimit: 9999 },
});
