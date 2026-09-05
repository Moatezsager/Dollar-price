const fs = require('fs');
let app = fs.readFileSync('src/App.tsx', 'utf8');

// Top Dropdown Menu - Inject About right before Contact
const contactTop = `                      <button
                        onClick={() => {
                          triggerHaptic(10);
                          setShowMoreMenu(false);
                          setCurrentPage('contact');
                        }}`;
const aboutTop = `                      <button
                        onClick={() => {
                          triggerHaptic(10);
                          setShowMoreMenu(false);
                          setCurrentPage('about');
                        }}
                        className="flex items-center gap-3 px-4 py-3 text-sm text-zinc-300 hover:text-white hover:bg-white/5 transition-colors w-full text-right"
                      >
                        <Info className="w-4 h-4 text-blue-400" />
                        <span className="font-medium">عن المنصة</span>
                      </button>
${contactTop}`;

if (app.includes(contactTop) && !app.includes("setCurrentPage('about');\n                        }}\n                        className=\"flex items-center")) {
  app = app.replace(contactTop, aboutTop);
}

// Mobile "More" Tab - Inject About right before Terms
const termsMore = `                <button
                  onClick={() => { triggerHaptic(10); setCurrentPage('terms'); }}`;
const aboutMore = `                <button
                  onClick={() => { triggerHaptic(10); setCurrentPage('about'); }}
                  className="w-full flex items-center gap-4 p-4 hover:bg-white/[0.02] active:bg-white/[0.05] transition-colors border-b border-white/5 text-right"
                >
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
                    <Info className="w-5 h-5 text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-white">عن المنصة</p>
                    <p className="text-xs text-zinc-400 mt-0.5">من نحن وكيف نعمل</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-zinc-600" />
                </button>
${termsMore}`;

if (app.includes(termsMore) && !app.includes("setCurrentPage('about'); }}\n                  className=\"w-full flex")) {
  app = app.replace(termsMore, aboutMore);
}

fs.writeFileSync('src/App.tsx', app, 'utf8');
console.log('Fixed Routing 2!');
