import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { cloudflare } from '@cloudflare/vite-plugin';
import path from 'path';
import {defineConfig} from 'vitest/config';

export default defineConfig(({ mode }) => {
  const isTest = mode === 'test';
  return {
    plugins: isTest ? [react(), tailwindcss()] : [react(), cloudflare(), tailwindcss()],
    test: {
      include: ['src/**/*.test.ts', 'worker/**/*.test.ts'],
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR can be disabled via DISABLE_HMR env var during automated edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
