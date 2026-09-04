const fs = require('fs');

let viteConfig = fs.readFileSync('vite.config.ts', 'utf8');

// We need to change the strategy for the service worker.
// Right now, Workbox generates sw.js, and you have public/push-sw.js
// For a fully unified offline + push experience, we should tell VitePWA to use injectManifest strategy
// OR simply add a network-first strategy for the app root.

const injectPattern = `
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,webp}'],
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: true,
          navigateFallback: '/index.html',
          navigateFallbackAllowlist: [/^(?!\\/api)/],
`;

viteConfig = viteConfig.replace(/workbox: \{\s*globPatterns:/, "workbox: {\n          navigateFallback: '/index.html',\n          navigateFallbackAllowlist: [/^(?!\\\\/api)/],\n          globPatterns:");

fs.writeFileSync('vite.config.ts', viteConfig, 'utf8');
console.log('Vite PWA configured for offline navigateFallback');
