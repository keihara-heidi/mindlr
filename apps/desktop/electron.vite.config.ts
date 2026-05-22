import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { TanStackRouterVite } from '@tanstack/router-plugin/vite';
import { resolve } from 'node:path';

const coopCoepHeaders = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',
};

export default defineConfig({
  main: {
    plugins: [
      externalizeDepsPlugin({
        exclude: ['@mindlr/db-schema', '@mindlr/ipc-contracts'],
      }),
    ],
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/main/index.ts'),
        },
      },
    },
    resolve: {
      alias: {
        '@main': resolve(__dirname, 'src/main'),
      },
    },
  },
  preload: {
    plugins: [
      externalizeDepsPlugin({
        exclude: ['@mindlr/db-schema', '@mindlr/ipc-contracts'],
      }),
    ],
    build: {
      rollupOptions: {
        input: {
          settings: resolve(__dirname, 'src/preload/settings.ts'),
          notch: resolve(__dirname, 'src/preload/notch.ts'),
        },
        output: {
          format: 'cjs',
          entryFileNames: '[name].cjs',
        },
      },
    },
  },
  renderer: {
    root: 'src/renderer',
    server: {
      headers: coopCoepHeaders,
    },
    preview: {
      headers: coopCoepHeaders,
    },
    build: {
      rollupOptions: {
        input: {
          settings: resolve(__dirname, 'src/renderer/settings/index.html'),
          notch: resolve(__dirname, 'src/renderer/notch/index.html'),
        },
      },
    },
    plugins: [
      tailwindcss(),
      TanStackRouterVite({
        target: 'react',
        autoCodeSplitting: true,
        routesDirectory: resolve(__dirname, 'src/renderer/settings/routes'),
        generatedRouteTree: resolve(__dirname, 'src/renderer/settings/routeTree.gen.ts'),
      }),
      react(),
    ],
    resolve: {
      alias: {
        '@shared': resolve(__dirname, 'src/renderer/shared'),
        '@settings': resolve(__dirname, 'src/renderer/settings'),
        '@notch': resolve(__dirname, 'src/renderer/notch'),
      },
    },
  },
});
