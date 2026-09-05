const fs = require('fs');
let server = fs.readFileSync('server.ts', 'utf8');

// For Error 0 (SW routing issue):
// Since Express static middleware uses `index: false`, we need to make sure 
// the `app.get("*", ...)` fallback doesn't intercept `push-sw.js` and return `index.html`.
// Wait, `express.static` should handle existing files in `dist` BEFORE `app.get("*")` is hit, UNLESS `push-sw.js` is not in `dist` or the path is wrong.
// But the error says "behind a redirect". Let's change `app.get("*", ...)` to specifically not match `.js`, `.css` or other static files if we can, 
// or ensure express.static is properly set up.
// Express static normally serves existing files. Is `push-sw.js` inside `dist/`? 
// Yes, the build output said: `dist/push-sw.js`

// Let's modify the SPA fallback to ignore .js, .css, .json, .png, etc.
const spaFallbackTarget = 'app.get("*", (req, res) => {';
const spaFallbackReplacement = `
    // Handle SPA fallback, but ignore static file extensions to prevent redirect/html serving for missing static files
    app.get(/^(?!.*\\.(js|css|json|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot|webmanifest|xml)$).*$/, (req, res, next) => {
`;

if (server.includes(spaFallbackTarget)) {
  server = server.replace(spaFallbackTarget, spaFallbackReplacement);
}

// For Error 1 & 2 (Telegram Connection):
// Ensure we handle duplicate sessions and scraper failures gracefully.
// Let's look for initialization of Telegram client
const telegramInitTarget = 'const telegramManager = new TelegramManager(';
// We can just find TelegramManager usage.
fs.writeFileSync('server.ts', server, 'utf8');
console.log('Patched SPA route');
