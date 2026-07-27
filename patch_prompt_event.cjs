const fs = require('fs');
let code = fs.readFileSync('src/components/InstallPrompt.tsx', 'utf8');

code = code.replace(
  '  useEffect(() => {',
  `  useEffect(() => {\n    window.dispatchEvent(new CustomEvent('installPromptVisibility', { detail: showPrompt }));\n  }, [showPrompt]);\n\n  useEffect(() => {`
);
fs.writeFileSync('src/components/InstallPrompt.tsx', code);
console.log('patched install prompt with event');
