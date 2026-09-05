const fs = require('fs');
let app = fs.readFileSync('src/App.tsx', 'utf8');

const usdCardShare = `
              <button 
                onClick={(e) => { e.stopPropagation(); handleShareCardImage('USD_CASH', 'دولار أمريكي (كاش)', usdRate, false); }}
                className="mr-auto w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
                title="مشاركة الصورة"
              >
                {isGeneratingShareImage && shareData?.code === 'USD_CASH' ? <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div> : <Share2 className="w-4 h-4" />}
              </button>
`;
const target = `<span className={\`text-xs font-bold font-mono \${usdIsUp ? 'text-rose-400' : usdIsDown ? 'text-emerald-400' : 'text-zinc-500'}\`}>
                  {prevUsdRate.toFixed(2)}
                </span>
              </div>`;
app = app.replace(target, target + usdCardShare);

const usdChecksCardShare = `
              <button 
                onClick={(e) => { e.stopPropagation(); handleShareCardImage('USD_CHECKS', 'دولار أمريكي (صكوك)', usdChecksRate, false); }}
                className="mr-auto w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
                title="مشاركة الصورة"
              >
                {isGeneratingShareImage && shareData?.code === 'USD_CHECKS' ? <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div> : <Share2 className="w-4 h-4" />}
              </button>
`;
const target2 = `<span className={\`text-xs font-bold font-mono \${usdChecksIsUp ? 'text-rose-400' : usdChecksIsDown ? 'text-emerald-400' : 'text-zinc-500'}\`}>
                  {prevUsdChecksRate.toFixed(2)}
                </span>
              </div>`;
app = app.replace(target2, target2 + usdChecksCardShare);

// Grid Share Buttons
const gridShareBtn1 = `
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleShareCardImage(term.id, term.name, rate, false); }}
                        className="mr-auto w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-zinc-500 hover:text-white transition-colors"
                      >
                        {isGeneratingShareImage && shareData?.code === term.id ? <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin"></div> : <Share2 className="w-3 h-3" />}
                      </button>
                    </div>`; 
const targetGrid1 = `<span className="text-[10px] text-zinc-500 font-medium mb-1 line-clamp-1">{term.name}</span>
                    </div>`;

// Replace all occurrences of targetGrid1
app = app.split(targetGrid1).join(targetGrid1.replace('</div>', gridShareBtn1));

const goldGridShareBtn = `
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleShareCardImage(metal.id, metal.name, rate, true); }}
                        className="mr-auto w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-zinc-500 hover:text-white transition-colors"
                      >
                        {isGeneratingShareImage && shareData?.code === metal.id ? <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin"></div> : <Share2 className="w-3 h-3" />}
                      </button>
                    </div>`;
const targetGold = `<span className="text-[10px] text-amber-500/50 font-medium mb-1 line-clamp-1">{metal.name}</span>
                    </div>`;

app = app.split(targetGold).join(targetGold.replace('</div>', goldGridShareBtn));

fs.writeFileSync('src/App.tsx', app, 'utf8');
console.log('Added share buttons (fixed regex)');
