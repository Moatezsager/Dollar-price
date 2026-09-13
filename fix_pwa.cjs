const fs = require('fs');
let c = fs.readFileSync('vite.config.ts', 'utf8');

c = c.replace(/devOptions:\s*\{\s*enabled:\s*true/g, "devOptions: {\n          enabled: false");

fs.writeFileSync('vite.config.ts', c);
console.log("Fixed PWA devOptions");
