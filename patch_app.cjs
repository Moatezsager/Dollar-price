const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// Add state
code = code.replace(
  'const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);',
  `const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);\n  const [isInstallPromptVisible, setIsInstallPromptVisible] = useState(false);`
);

// Add event listener
const targetEffect = `  useEffect(() => {
    // Initial data fetch
    fetchRates();`;

const replaceEffect = `  useEffect(() => {
    const handleInstallPrompt = (e: any) => setIsInstallPromptVisible(e.detail);
    window.addEventListener('installPromptVisibility', handleInstallPrompt);
    return () => window.removeEventListener('installPromptVisibility', handleInstallPrompt);
  }, []);

  useEffect(() => {
    // Initial data fetch
    fetchRates();`;
code = code.replace(targetEffect, replaceEffect);

// Update Telegram FAB positioning
const targetFAB = `        className="fixed bottom-6 left-6 z-[999] flex items-center justify-center w-14 h-14 bg-[#24A1DE] text-white rounded-full shadow-[0_8px_30px_rgb(36,161,222,0.4)] hover:shadow-[0_8px_40px_rgb(36,161,222,0.6)] border border-white/10 group overflow-hidden"`;
const replaceFAB = `        className={\`fixed left-6 z-[999] flex items-center justify-center w-14 h-14 bg-[#24A1DE] text-white rounded-full shadow-[0_8px_30px_rgb(36,161,222,0.4)] hover:shadow-[0_8px_40px_rgb(36,161,222,0.6)] border border-white/10 group overflow-hidden transition-all duration-500 \${isInstallPromptVisible ? 'bottom-40' : 'bottom-6'}\`}`;
code = code.replace(targetFAB, replaceFAB);

fs.writeFileSync('src/App.tsx', code);
console.log('App patched');
