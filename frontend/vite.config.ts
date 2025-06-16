import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import checker from 'vite-plugin-checker';
import { createHtmlPlugin } from 'vite-plugin-html';
import svgr from 'vite-plugin-svgr';
import { dependencies } from './package.json';

function renderChunks(deps: Record<string, string>): Record<string, string[]> {
  const chunks: Record<string, string[]> = {};

  Object.keys(deps).forEach((key) => {
    if (['react', 'react-router-dom', 'react-dom'].includes(key)) return;
    chunks[key] = [key];
  });

  return chunks;
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd());

  return {
    server: {
      hmr: true,
      port: 3000,
      open: true, // Vite 서버 실행 시 브라우저 자동 오픈
      cors: {
        origin: '*',
      },
    },
    plugins: [
      react({ include: ['**/*.tsx', '**/*.ts'] }),
      svgr(),
      checker({ typescript: true }),
      tsconfigPaths(),
      createHtmlPlugin({
        minify: true,
        inject: {
          data: {
            ...env,
            Mode: mode,
          },
        },
      }),
    ],
    resolve: {
      alias: [{ find: '@', replacement: '/src' }],
    },
    css: {
      modules: {
        localsConvention: 'camelCase',
      },
      preprocessorOptions: {
        scss: {
          additionalData: `@use '@/styles/_variables.scss' as *;`,
        },
      },
    },
    build: {
      sourcemap: false,
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-router-dom', 'react-dom'],
            ...renderChunks(dependencies),
          },
        },
      },
    },
  };
});
