const fs = require('fs');
let code = fs.readFileSync('src/components/InstallPrompt.tsx', 'utf8');

const oldTrack = `        await fetch('/api/track/install', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ platform: 'pwa_prompt' })
        });`;

code = code.replace(oldTrack, `// Tracked by appinstalled event instead to prevent double counting`);

fs.writeFileSync('src/components/InstallPrompt.tsx', code);
console.log('patched InstallPrompt.tsx');
