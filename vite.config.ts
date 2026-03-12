import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      react(), 
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        manifest: {
          name: 'مؤشر الدينار',
          short_name: 'مؤشر الدينار',
          description: 'متابعة أسعار العملات والذهب في ليبيا لحظة بلحظة',
          theme_color: '#050505',
          background_color: '#050505',
          display: 'standalone',
          orientation: 'portrait',
          dir: 'rtl',
          lang: 'ar',
          icons: [
            {
              src: 'https://cdn-icons-png.flaticon.com/512/2488/2488649.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any maskable'
            },
            {
              src: 'https://cdn-icons-png.flaticon.com/512/2488/2488649.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable'
            }
          ]
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/hatscripts\.github\.io\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'flag-icons-cache',
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            },
            {
              urlPattern: /^\/api\/rates/i,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'rates-cache',
                expiration: {
                  maxEntries: 5,
                  maxAgeSeconds: 60 * 60 // 1 hour
                },
                networkTimeoutSeconds: 5
              }
            },
            {
              urlPattern: /^\/api\/history/i,
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'history-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 // 24 hours
                }
              }
            }
          ]
        }
      })
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
    build: {
      chunkSizeWarningLimit: 1600,
    },
  };
});
