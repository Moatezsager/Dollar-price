const fs = require('fs');
let app = fs.readFileSync('src/App.tsx', 'utf8');

const oldFooter = `
      {/* ====== DESKTOP FOOTER (Hidden on Mobile) ====== */}
      <footer className="hidden md:flex flex-col items-center justify-center py-10 mt-12 border-t border-white/10 bg-[#050505] relative z-10 w-full px-6 max-w-7xl mx-auto">
        <div className="w-full max-w-2xl mx-auto mb-10 pb-10 border-b border-white/5">
           <div className="text-center mb-4">
             <h3 className="text-lg font-bold text-white mb-2">تطبيق مؤشر الدينار</h3>
             <p className="text-zinc-400 text-sm">احصل على أسرع وأفضل تجربة للمنصة من خلال التثبيت على جهازك.</p>
           </div>
           <AppInstallUninstall />
        </div>
        
        <div className="flex items-center justify-center gap-8 mb-8">
          <button onClick={() => setActiveTab('terms')} className="text-sm font-medium text-zinc-400 hover:text-emerald-400 transition-colors">
            شروط الاستخدام
          </button>
          <button onClick={() => setActiveTab('privacy')} className="text-sm font-medium text-zinc-400 hover:text-emerald-400 transition-colors">
            سياسة الخصوصية
          </button>
          <button onClick={() => setActiveTab('contact')} className="text-sm font-medium text-zinc-400 hover:text-emerald-400 transition-colors">
            اتصل بنا
          </button>
          <button onClick={() => setActiveTab('developers')} className="text-sm font-medium text-zinc-400 hover:text-emerald-400 transition-colors">
            عن المنصة
          </button>
        </div>`;

const newFooter = `
      {/* ====== DESKTOP FOOTER (Hidden on Mobile) ====== */}
      <footer className="hidden md:flex flex-col items-center justify-center py-10 mt-12 border-t border-white/10 bg-[#050505] relative z-10 w-full px-6 max-w-7xl mx-auto">
        <div className="w-full max-w-2xl mx-auto mb-10 pb-10 border-b border-white/5">
           <div className="text-center mb-4">
             <h3 className="text-lg font-bold text-white mb-2">تطبيق مؤشر الدينار</h3>
             <p className="text-zinc-400 text-sm">احصل على أسرع وأفضل تجربة للمنصة من خلال التثبيت على جهازك.</p>
           </div>
           <AppInstallUninstall />
        </div>
        
        <div className="flex items-center justify-center gap-8 mb-8">
          <button onClick={() => { window.scrollTo(0,0); setCurrentPage('terms'); }} className="text-sm font-medium text-zinc-400 hover:text-emerald-400 transition-colors">
            شروط الاستخدام
          </button>
          <button onClick={() => { window.scrollTo(0,0); setCurrentPage('privacy'); }} className="text-sm font-medium text-zinc-400 hover:text-emerald-400 transition-colors">
            سياسة الخصوصية
          </button>
          <button onClick={() => { window.scrollTo(0,0); setCurrentPage('contact'); }} className="text-sm font-medium text-zinc-400 hover:text-emerald-400 transition-colors">
            اتصل بنا
          </button>
          <button onClick={() => { window.scrollTo(0,0); setCurrentPage('api'); }} className="text-sm font-medium text-zinc-400 hover:text-emerald-400 transition-colors">
            بوابة المطورين
          </button>
        </div>`;

if (app.includes('setActiveTab(\'terms\')') && app.includes('Desktop Footer')) {
  app = app.replace(oldFooter, newFooter);
  fs.writeFileSync('src/App.tsx', app, 'utf8');
  console.log('Patched App.tsx desktop footer links');
} else {
  console.log('Target not found in App.tsx');
}
