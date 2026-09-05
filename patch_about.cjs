const fs = require('fs');
let app = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Add import if it doesn't exist
if (!app.includes('import About from "./components/About"')) {
  app = app.replace(
    'import Contact from "./components/Contact";',
    'import Contact from "./components/Contact";\nimport About from "./components/About";'
  );
}

// 2. Add 'about' to currentPage type definition
// Look for: useState<'dashboard' | 'api' | 'contact' | 'terms' | 'privacy'>('dashboard')
if (!app.includes("'about'")) {
  app = app.replace(
    "useState<'dashboard' | 'api' | 'contact' | 'terms' | 'privacy'>",
    "useState<'dashboard' | 'api' | 'contact' | 'terms' | 'privacy' | 'about'>"
  );
}

// 3. Add to the AnimatePresence switch block
const targetSwitch = `        ) : currentPage === 'contact' ? (
          <motion.div key="contact" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}><Contact onBack={() => setCurrentPage('dashboard')} /></motion.div>
        ) : (`;

const replaceSwitch = `        ) : currentPage === 'contact' ? (
          <motion.div key="contact" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}><Contact onBack={() => setCurrentPage('dashboard')} /></motion.div>
        ) : currentPage === 'about' ? (
          <motion.div key="about" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}><About onBack={() => setCurrentPage('dashboard')} /></motion.div>
        ) : (`;

if (app.includes(targetSwitch)) {
  app = app.replace(targetSwitch, replaceSwitch);
}

// 4. Update Desktop Footer
const desktopTarget = `<button onClick={() => { window.scrollTo(0,0); setCurrentPage('api'); }} className="text-sm font-medium text-zinc-400 hover:text-emerald-400 transition-colors">
            بوابة المطورين
          </button>`;
const desktopReplace = `<button onClick={() => { window.scrollTo(0,0); setCurrentPage('about'); }} className="text-sm font-medium text-zinc-400 hover:text-emerald-400 transition-colors">
            عن المنصة
          </button>`;

if (app.includes(desktopTarget)) {
  app = app.replace(desktopTarget, desktopReplace);
}

// 5. Update Mobile "More" Tab Menu
// In mobile menu, we have:
// <button onClick={() => { triggerHaptic(10); setCurrentPage('contact'); }}
// We can add "عن المنصة" above or below it.
const mobileContactTarget = `                <button
                  onClick={() => { triggerHaptic(10); setCurrentPage('contact'); }}
                  className="w-full flex items-center gap-4 p-4 hover:bg-white/[0.02] active:bg-white/[0.05] transition-colors text-right"
                >
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                    <Mail className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-white font-bold text-sm">اتصل بنا</h3>
                    <p className="text-[11px] text-zinc-500 mt-0.5">للإبلاغ عن مشكلة أو اقتراح</p>
                  </div>
                </button>`;

const mobileAboutReplace = `                <button
                  onClick={() => { triggerHaptic(10); setCurrentPage('about'); }}
                  className="w-full flex items-center gap-4 p-4 hover:bg-white/[0.02] active:bg-white/[0.05] transition-colors border-b border-white/5 text-right"
                >
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
                    <Info className="w-5 h-5 text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-white font-bold text-sm">عن المنصة</h3>
                    <p className="text-[11px] text-zinc-500 mt-0.5">من نحن وكيف نعمل</p>
                  </div>
                </button>
                
${mobileContactTarget}`;

if (app.includes(mobileContactTarget) && !app.includes("setCurrentPage('about')")) {
  app = app.replace(mobileContactTarget, mobileAboutReplace);
}

// Also check if Info icon is imported in App.tsx
if (!app.includes('Info,') && !app.includes(', Info')) {
  app = app.replace('import { ', 'import { Info, ');
}

fs.writeFileSync('src/App.tsx', app, 'utf8');
console.log('Patched About platform');
