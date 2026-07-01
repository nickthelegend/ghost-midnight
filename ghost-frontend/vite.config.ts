import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';
import path from 'path';

export default defineConfig({
  plugins: [react(), wasm(), topLevelAwait()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@ghost/ghost-contract': path.resolve(__dirname, '../ghost-contract/src'),
    },
  },
  server: {
    port: 3007,
    open: true,
    headers: {
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin',
    },
    proxy: {
      '/api/indexer': {
        target: 'https://indexer.preprod.midnight.network',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api\/indexer/, '/api/v4/graphql'),
      },
      '/api/proof': {
        target: 'http://localhost:6300',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api\/proof/, ''),
      },
    },
  },
  optimizeDeps: {
    exclude: ['@midnight-ntwrk/compact-runtime', '@midnight-ntwrk/ledger-v7'],
  },
  build: {
    sourcemap: true,
  },
});
