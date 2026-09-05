const fs = require('fs');
let app = fs.readFileSync('src/App.tsx', 'utf8');

// USD Cash
const usdTarget = `              ) : (
                <div className="flex items-center gap-1.5 text-zinc-400 text-sm font-medium bg-zinc-500/10 px-2.5 py-1 rounded-full border border-zinc-500/20">
                  <span className="font-mono" dir="ltr">0.00</span>
                </div>
              )}
            </div>`;

const usdPatch = `              ) : (
                <div className="flex items-center gap-1.5 text-zinc-400 text-sm font-medium bg-zinc-500/10 px-2.5 py-1 rounded-full border border-zinc-500/20">
                  <span className="font-mono" dir="ltr">0.00</span>
                </div>
              )}
              
              <button 
                onClick={(e) => { e.stopPropagation(); handleShareCardImage('USD_CASH', 'دولار أمريكي', usdRate, false); }}
                className="mr-auto w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-emerald-500/20 hover:border-emerald-500/30 transition-all shadow-[0_0_15px_rgba(0,0,0,0.5)]"
                title="مشاركة الصورة"
              >
                {isGeneratingShareImage && shareData?.code === 'USD_CASH' ? <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin"></div> : <Share2 className="w-4 h-4" />}
              </button>
            </div>`;

app = app.replace(usdTarget, usdPatch);

// USD Checks
const checksTarget = `              <div className="flex flex-col justify-center">
                <span className="text-[10px] text-zinc-600 mb-1">السعر السابق</span>
                <span className="text-sm text-zinc-400 font-mono" dir="ltr">{prevUsdChecksRate.toFixed(2)}</span>
              </div>
            </div>`;

const checksPatch = `              <div className="flex flex-col justify-center">
                <span className="text-[10px] text-zinc-600 mb-1">السعر السابق</span>
                <span className="text-sm text-zinc-400 font-mono" dir="ltr">{prevUsdChecksRate.toFixed(2)}</span>
              </div>
              <button 
                onClick={(e) => { e.stopPropagation(); handleShareCardImage('USD_CHECKS', 'دولار أمريكي (صكوك)', usdChecksRate, false); }}
                className="mr-auto w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-emerald-500/20 hover:border-emerald-500/30 transition-all"
                title="مشاركة الصورة"
              >
                {isGeneratingShareImage && shareData?.code === 'USD_CHECKS' ? <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin"></div> : <Share2 className="w-4 h-4" />}
              </button>
            </div>`;

app = app.replace(checksTarget, checksPatch);

fs.writeFileSync('src/App.tsx', app, 'utf8');
console.log('Patched big cards');
