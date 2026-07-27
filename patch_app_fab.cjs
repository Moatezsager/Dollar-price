const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const targetStr = `isInstallPromptVisible ? 'bottom-40' : 'bottom-6'`;
const replaceStr = `isInstallPromptVisible ? 'bottom-32 md:bottom-32' : 'bottom-20 md:bottom-6'`;

code = code.replace(targetStr, replaceStr);
fs.writeFileSync('src/App.tsx', code);
console.log('patched Telegram FAB position');
