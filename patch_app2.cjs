const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const targetStr = \`  // PWA Install Logic
  useEffect(() => {\`;

const replaceStr = \`  useEffect(() => {
    const handleInstallPrompt = (e) => setIsInstallPromptVisible(e.detail);
    window.addEventListener('installPromptVisibility', handleInstallPrompt);
    return () => window.removeEventListener('installPromptVisibility', handleInstallPrompt);
  }, []);

  // PWA Install Logic
  useEffect(() => {\`;

code = code.replace(targetStr, replaceStr);
fs.writeFileSync('src/App.tsx', code);
console.log('Event listener added');
