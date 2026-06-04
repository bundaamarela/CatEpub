/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath, URL } from 'node:url';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'pwa-192.svg', 'pwa-512.svg'],
      manifest: {
        name: 'Cat Epub',
        short_name: 'Cat Epub',
        description: 'Leitor de EPUB minimalista com identidade visual Cat Epub.',
        lang: 'pt-PT',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#111111',
        icons: [
          { src: 'pwa-192.svg', sizes: '192x192', type: 'image/svg+xml', purpose: 'any' },
          { src: 'pwa-512.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'any maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-api',
              expiration: { maxEntries: 50, maxAgeSeconds: 60 },
              networkTimeoutSeconds: 5,
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      'foliate-js': fileURLToPath(new URL('./vendor/foliate-js', import.meta.url)),
    },
  },
  // foliate-js usa ESM puro com imports relativos; deixa o Vite servir
  // como source em vez de pre-bundle.
  optimizeDeps: {
    exclude: ['foliate-js'],
  },
  server: {
    port: 5173,
    strictPort: true,
    fs: {
      // Permite servir ficheiros do submódulo vendor/.
      allow: ['..', '.'],
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    passWithNoTests: true,
    exclude: ['tests/e2e/**', '**/node_modules/**'],
  },
});
