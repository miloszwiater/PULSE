import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { cloudflare } from '@cloudflare/vite-plugin';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    cloudflare(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'prompt',
      injectRegister: false,
      manifest: {
        name: 'PULSE',
        short_name: 'PULSE',
        description: 'Osobisty system rozwoju kariery muzycznej.',
        lang: 'pl',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#05070F',
        theme_color: '#05070F',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,woff2,png,svg}'],
        // Polish UI needs latin + latin-ext only; other subsets load on demand if ever used.
        globIgnores: ['**/*-{cyrillic,cyrillic-ext,greek,vietnamese,math,symbols}-*.woff2'],
      },
      devOptions: { enabled: false },
    }),
  ],
});
