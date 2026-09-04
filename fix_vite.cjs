const fs = require('fs');

let viteConfig = fs.readFileSync('vite.config.ts', 'utf8');

// We need to completely remove the old workbox block since we are using injectManifest
// Otherwise VitePWA will throw an error about duplicate properties.

const replacement = `
      VitePWA({
        registerType: 'autoUpdate',
        strategies: 'injectManifest',
        srcDir: 'public',
        filename: 'push-sw.js',
        injectManifest: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,webp}'],
        },
`;

viteConfig = viteConfig.replace(/VitePWA\(\{[\s\S]*?workbox: \{[\s\S]*?\}\s*\}\)/, replacement + "      })");
// Wait, regex might fail on nested brackets. Let's do it simpler.

let parts = viteConfig.split('manifest: {');
let start = parts[0];
let rest = 'manifest: {' + parts[1];

let workboxIndex = rest.indexOf('workbox: {');
let newRest = rest.substring(0, workboxIndex);

newRest += `
        injectManifest: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,webp}']
        }
      })
`;

fs.writeFileSync('vite.config.ts', start + newRest + "    ],\n    resolve: {\n      alias: {\n        '@': path.resolve(__dirname, '.'),\n      },\n    },\n    server: {\n      hmr: process.env.DISABLE_HMR !== 'true',\n    },\n    build: {\n      target: 'es2020',\n      chunkSizeWarningLimit: 1600,\n    },\n  };\n});", 'utf8');
console.log('Cleaned up vite config for injectManifest');
