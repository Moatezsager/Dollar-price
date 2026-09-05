const fs = require('fs');
let vite = fs.readFileSync('vite.config.ts', 'utf8');

const target = `injectManifest: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,webp}'],
        }`;

const replacement = `injectManifest: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,webp}'],
        },
        devOptions: {
          enabled: true,
          type: 'module',
          navigateFallback: 'index.html',
        }`;

if (vite.includes(target)) {
  vite = vite.replace(target, replacement);
  fs.writeFileSync('vite.config.ts', vite, 'utf8');
  console.log('Fixed vite.config.ts');
} else {
  console.log('Target not found in vite.config.ts');
}
