const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');

const startTag = "{/* ====== BOTTOM NAVIGATION BAR (Mobile Only) ====== */}";
const endTag = "{/* In-App Toasts */}";

const startIndex = content.indexOf(startTag);
const endIndex = content.indexOf(endTag);

if (startIndex !== -1 && endIndex !== -1) {
  const replacement = `${startTag}
      <div className="md:hidden fixed bottom-6 left-4 right-4 z-[90] pb-safe pointer-events-none flex justify-center">
        <nav
          dir="ltr"
          className="pointer-events-auto w-full max-w-[380px] bg-[#0f172a]/80 backdrop-blur-3xl border border-slate-700/50 rounded-[2.5rem] p-2 flex items-center justify-between shadow-[0_30px_60px_-15px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.1)]"
        >
          {[
            { id: 'main', icon: Home, label: 'الرئيسية', color: 'emerald' },
            { id: 'gold', icon: Coins, label: 'الذهب', color: 'amber' },
            { id: 'converter', icon: Calculator, label: 'المحول', color: 'blue' },
            { id: 'charts', icon: LineChart, label: 'التحليل', color: 'fuchsia' },
            { id: 'more', icon: LayoutGrid, label: 'المزيد', color: 'indigo' },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            
            // Map colors to hex for specific styling
            const colorMap = {
              emerald: 'text-emerald-400',
              amber: 'text-amber-400',
              blue: 'text-blue-400',
              fuchsia: 'text-fuchsia-400',
              indigo: 'text-indigo-400',
            };
            
            const bgMap = {
              emerald: 'bg-emerald-500/15',
              amber: 'bg-amber-500/15',
              blue: 'bg-blue-500/15',
              fuchsia: 'bg-fuchsia-500/15',
              indigo: 'bg-indigo-500/15',
            };
            
            return (
              <button
                key={tab.id}
                onClick={() => { triggerHaptic(8); setActiveTab(tab.id as any); }}
                className={\`relative flex flex-col items-center justify-center w-[4.5rem] h-16 rounded-[2rem] transition-all duration-500 outline-none select-none \${isActive ? colorMap[tab.color as keyof typeof colorMap] : 'text-slate-500 hover:text-slate-300'}\`}
              >
                {isActive && (
                  <motion.div
                    layoutId="active-nav-pill"
                    className={\`absolute inset-0 \${bgMap[tab.color as keyof typeof bgMap]} rounded-[2rem]\`}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  />
                )}
                <motion.div 
                  initial={false}
                  animate={isActive ? { y: -2, scale: 1.1 } : { y: 0, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  className="relative z-10 flex flex-col items-center justify-center gap-1.5"
                >
                  <Icon strokeWidth={isActive ? 2.5 : 2} className="w-5 h-5 drop-shadow-md" />
                  <span className={\`text-[10px] font-bold tracking-wide transition-all duration-300 \${isActive ? 'opacity-100' : 'opacity-70'}\`} style={{ fontFamily: 'Cairo, sans-serif' }}>
                    {tab.label}
                  </span>
                </motion.div>
                {isActive && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 }}
                    className={\`absolute -bottom-1 w-1 h-1 rounded-full \${bgMap[tab.color as keyof typeof bgMap].replace('/15', '')} shadow-[0_0_8px_currentColor]\`}
                  />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      `;

  content = content.substring(0, startIndex) + replacement + content.substring(endIndex);
  fs.writeFileSync('src/App.tsx', content);
  console.log('Bottom nav successfully upgraded!');
} else {
  console.log('Could not find start or end tags.');
}

