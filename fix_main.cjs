const fs = require('fs');

let mainTs = fs.readFileSync('src/main.tsx', 'utf8');

// Remove the manual push-sw.js registration and the virtual:pwa-register since we merged them
mainTs = mainTs.replace(/import \{ registerSW \} from 'virtual:pwa-register';/, '');

const regexVirtual = /\/\/ Register Workbox PWA service worker \(caching\)[\s\S]*?logErrorToServer\(error, 'Service Worker Registration Call Error'\);\n}/;
mainTs = mainTs.replace(regexVirtual, '');

const regexManual = /\/\/ Register the dedicated Push Service Worker \(push-sw\.js\)[\s\S]*?\}\);\n}/;
const newRegistration = `
// Register unified Service Worker (Caching + Push)
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/push-sw.js', { scope: '/', type: 'module' })
    .then(reg => {
      console.log('[SW] Unified Service Worker Registered. Scope:', reg.scope);
    })
    .catch(err => {
      console.error('[SW] Registration failed:', err);
    });
}
`;

mainTs = mainTs.replace(regexManual, newRegistration);

fs.writeFileSync('src/main.tsx', mainTs, 'utf8');
console.log('Fixed main.tsx to use single unified service worker');
