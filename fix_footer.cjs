const fs = require('fs');
let app = fs.readFileSync('src/App.tsx', 'utf8');

const target = `      {/* ====== BOTTOM NAVIGATION BAR (Mobile Only) ====== */}`;

const footerCode = `
      {/* ====== DESKTOP FOOTER (Hidden on Mobile) ====== */}
      <footer className="hidden md:flex flex-col items-center justify-center py-10 mt-12 border-t border-white/10 bg-[#050505] relative z-10 w-full px-6 max-w-7xl mx-auto">
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
        </div>
        <div className="flex flex-col items-center gap-3 opacity-60 hover:opacity-100 transition-opacity">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-blue-500/20 flex items-center justify-center border border-white/10">
            <img src="/logo.png" alt="Logo" className="w-6 h-6 rounded-full" />
          </div>
          <span className="text-xs text-zinc-500 font-medium">مؤشر الدينار &copy; {new Date().getFullYear()} - جميع الحقوق محفوظة</span>
        </div>
      </footer>
`;

if (app.includes(target) && !app.includes('DESKTOP FOOTER')) {
  app = app.replace(target, footerCode + '\n      ' + target);
  fs.writeFileSync('src/App.tsx', app, 'utf8');
  console.log('Added desktop footer successfully');
} else {
  console.log('Target not found');
}
