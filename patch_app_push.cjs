const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

if (!code.includes('import PushNotificationPrompt')) {
  code = code.replace(
    'import InstallPrompt from "./components/InstallPrompt";',
    'import InstallPrompt from "./components/InstallPrompt";\nimport PushNotificationPrompt from "./components/PushNotificationPrompt";'
  );
}

if (!code.includes('<PushNotificationPrompt />')) {
  code = code.replace(
    '<InstallPrompt />',
    '<InstallPrompt />\n        <PushNotificationPrompt />'
  );
}

fs.writeFileSync('src/App.tsx', code);
console.log('patched App.tsx with PushNotificationPrompt');
