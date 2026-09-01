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
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg', 'logo.png'],
        manifest: {
          name: 'مؤشر الدينار | أسعار العملات في ليبيا',
          short_name: 'مؤشر الدينار',
          description: 'متابعة أسعار العملات والذهب في ليبيا لحظة بلحظة من السوق الموازي والمصرف المركزي',
          theme_color: '#050505',
          background_color: '#050505',
          display: 'standalone',
          display_override: ['window-controls-overlay', 'standalone', 'minimal-ui'],
          orientation: 'portrait',
          dir: 'rtl',
          lang: 'ar',
          start_url: '/',
          scope: '/',
          id: '/',
          categories: ['finance', 'business', 'utilities'],
          shortcuts: [
            {
              name: 'المحول',
              short_name: 'المحول',
              description: 'فتح محول العملات مباشرة',
              url: '/?section=converter',
              icons: [{ src: '/logo.png', sizes: '192x192' }]
            },
            {
              name: 'أسعار الذهب',
              short_name: 'الذهب',
              description: 'فتح أسعار الذهب والمعادن',
              url: '/?section=gold',
              icons: [{ src: '/logo.png', sizes: '192x192' }]
            }
          ],
          icons: [
            {
              src: '/logo.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: '/logo.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'maskable'
            },
            {
              src: '/logo.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: '/logo.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable'
            }
          ],
          screenshots: [
            {
              src: 'https://picsum.photos/seed/dinar-mobile/1080/1920',
              sizes: '1080x1920',
              type: 'image/png',
              form_factor: 'narrow',
              label: 'واجهة التطبيق على الهاتف'
            },
            {
              src: 'https://picsum.photos/seed/dinar-desktop/1920/1080',
              sizes: '1920x1080',
              type: 'image/png',
              form_factor: 'wide',
              label: 'واجهة التطبيق على الكمبيوتر'
            }
          ]
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,webp}'],
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: true,
          // push-sw.js is a standalone dedicated service worker served from /public.
          // Do NOT import it here – it causes conflicts with Workbox's own push handling.
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365
                },
                cacheableResponse: { statuses: [0, 200] }
              }
            },
            {
              urlPattern: /^https:\/\/hatscripts\.github\.io\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'flag-icons-cache',
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 60 * 60 * 24 * 30
                },
                cacheableResponse: { statuses: [0, 200] }
              }
            },
            {
              urlPattern: /^\/api\/rates/i,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'rates-cache',
                expiration: {
                  maxEntries: 5,
                  maxAgeSeconds: 60 * 60
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
                  maxAgeSeconds: 60 * 60 * 24
                }
              }
            }
          ]
        }
      })
    ],
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
      target: 'es2020',
      chunkSizeWarningLimit: 1600,
    },
  };
});
