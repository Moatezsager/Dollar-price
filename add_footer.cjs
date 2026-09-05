const fs = require('fs');
let app = fs.readFileSync('src/App.tsx', 'utf8');

// We need to add a footer to the desktop version.
// Looking for the end of the main container before the bottom navigation.
const target = `
      {/* Bottom Navigation (Mobile Only) */}
`;

const footerCode = `
      {/* Desktop Footer */}
      <footer className="hidden md:flex flex-col items-center justify-center py-10 mt-12 border-t border-white/10 bg-black/50 backdrop-blur-md">
        <div className="flex items-center justify-center gap-8 mb-6">
          <button onClick={() => setCurrentTab('terms')} className="text-sm font-medium text-zinc-400 hover:text-emerald-400 transition-colors">
            شروط الاستخدام
          </button>
          <button onClick={() => setCurrentTab('privacy')} className="text-sm font-medium text-zinc-400 hover:text-emerald-400 transition-colors">
            سياسة الخصوصية
          </button>
          <button onClick={() => setCurrentTab('contact')} className="text-sm font-medium text-zinc-400 hover:text-emerald-400 transition-colors">
            اتصل بنا
          </button>
          <button onClick={() => setCurrentTab('developers')} className="text-sm font-medium text-zinc-400 hover:text-emerald-400 transition-colors">
            عن المنصة
          </button>
        </div>
        <div className="flex items-center gap-3 opacity-70 hover:opacity-100 transition-opacity">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500/20 to-blue-500/20 flex items-center justify-center border border-white/10">
            <img src="/logo.png" alt="Logo" className="w-5 h-5 rounded-full" />
          </div>
          <span className="text-xs text-zinc-500 font-medium">مؤشر الدينار &copy; {new Date().getFullYear()}</span>
        </div>
      </footer>
`;

if (app.includes(target) && !app.includes('Desktop Footer')) {
  app = app.replace(target, footerCode + '\n' + target);
  fs.writeFileSync('src/App.tsx', app, 'utf8');
  console.log('Added desktop footer');
} else {
  console.log('Could not find insertion point or footer already exists');
}
