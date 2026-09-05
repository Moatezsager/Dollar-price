const fs = require('fs');
let app = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Desktop Footer: Change `setCurrentPage('api');` to `setCurrentPage('about');` ONLY for "عن المنصة"
const desktopBtn = `<button onClick={() => { window.scrollTo(0,0); setCurrentPage('api'); }} className="text-sm font-medium text-zinc-400 hover:text-emerald-400 transition-colors">
            عن المنصة
          </button>`;
const desktopBtnFixed = `<button onClick={() => { window.scrollTo(0,0); setCurrentPage('about'); }} className="text-sm font-medium text-zinc-400 hover:text-emerald-400 transition-colors">
            عن المنصة
          </button>`;

app = app.replace(desktopBtn, desktopBtnFixed);

// 2. Mobile Menu (Top right dropdown menu)
// Look for setCurrentPage('api') paired with "بوابة المطورين"
const topMenuBtn = `                        onClick={() => {
                          triggerHaptic(10);
                          setShowMoreMenu(false);
                          setCurrentPage('api');
                        }}
                        className="flex items-center gap-3 px-4 py-3 text-sm text-zinc-300 hover:text-white hover:bg-white/5 transition-colors w-full text-right"
                      >
                        <Code2 className="w-4 h-4 text-purple-400" />
                        <span className="font-medium">بوابة المطورين</span>`;
const topMenuAboutBtn = `                        onClick={() => {
                          triggerHaptic(10);
                          setShowMoreMenu(false);
                          setCurrentPage('about');
                        }}
                        className="flex items-center gap-3 px-4 py-3 text-sm text-zinc-300 hover:text-white hover:bg-white/5 transition-colors w-full text-right"
                      >
                        <Info className="w-4 h-4 text-blue-400" />
                        <span className="font-medium">عن المنصة</span>
                      </button>
                      <button
${topMenuBtn}`;
if (app.includes(topMenuBtn) && !app.includes("setCurrentPage('about')")) {
  app = app.replace(topMenuBtn, topMenuAboutBtn);
}


// 3. Mobile "More" Tab Menu
// Look for setCurrentPage('api') in the More tab
const moreMenuBtn = `                <button
                  onClick={() => { triggerHaptic(10); setCurrentPage('api'); }}
                  className="w-full flex items-center gap-4 p-4 hover:bg-white/[0.02] active:bg-white/[0.05] transition-colors border-b border-white/5 text-right"
                >
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center shrink-0">
                    <Code2 className="w-5 h-5 text-purple-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-white font-bold text-sm">بوابة المطورين</h3>
                    <p className="text-[11px] text-zinc-500 mt-0.5">API Integration</p>
                  </div>
                </button>`;

const moreMenuAboutBtn = `                <button
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
${moreMenuBtn}`;

if (app.includes(moreMenuBtn)) {
  app = app.replace(moreMenuBtn, moreMenuAboutBtn);
}

fs.writeFileSync('src/App.tsx', app, 'utf8');
console.log('Fixed Routing!');
