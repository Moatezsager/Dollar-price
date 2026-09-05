const fs = require('fs');
let app = fs.readFileSync('src/App.tsx', 'utf8');

// Ensure import is added
if (!app.includes('import AppInstallUninstall')) {
  app = app.replace('import InstallPrompt from "./components/InstallPrompt";', 'import InstallPrompt from "./components/InstallPrompt";\nimport AppInstallUninstall from "./components/AppInstallUninstall";');
}

const targetFooter = `
      {/* ====== DESKTOP FOOTER (Hidden on Mobile) ====== */}
      <footer className="hidden md:flex flex-col items-center justify-center py-10 mt-12 border-t border-white/10 bg-[#050505] relative z-10 w-full px-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-center gap-8 mb-8">`;

const replaceFooter = `
      {/* ====== DESKTOP FOOTER (Hidden on Mobile) ====== */}
      <footer className="hidden md:flex flex-col items-center justify-center py-10 mt-12 border-t border-white/10 bg-[#050505] relative z-10 w-full px-6 max-w-7xl mx-auto">
        <div className="w-full max-w-2xl mx-auto mb-10 pb-10 border-b border-white/5">
           <div className="text-center mb-4">
             <h3 className="text-lg font-bold text-white mb-2">تطبيق مؤشر الدينار</h3>
             <p className="text-zinc-400 text-sm">احصل على أسرع وأفضل تجربة للمنصة من خلال التثبيت على جهازك.</p>
           </div>
           <AppInstallUninstall />
        </div>
        
        <div className="flex items-center justify-center gap-8 mb-8">`;

if (app.includes(targetFooter) && !app.includes('<AppInstallUninstall />')) {
  app = app.replace(targetFooter, replaceFooter);
}

// Add to the 'more' tab for mobile
const targetMoreTab = `<section id="currency-converter-section" className={\`mt-16 \${activeTab === 'converter' ? '' : 'hidden md:block'}\`}>`;

const replaceMoreTab = `<section id="currency-converter-section" className={\`mt-16 \${activeTab === 'converter' ? '' : 'hidden md:block'}\`}>`;

// Actually let's find the `more` tab implementation.
// In the grep output: `2845:        <div className={activeTab === 'more' ? 'block md:hidden' : 'hidden'}>`
fs.writeFileSync('src/App.tsx', app, 'utf8');
console.log('Patched App.tsx with AppInstallUninstall');
