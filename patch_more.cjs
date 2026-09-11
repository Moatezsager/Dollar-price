const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');

// The main logo text
content = content.replace(/<span className="text-xl sm:text-2xl font-black tracking-tighter text-white">/g, '<span className="text-xl sm:text-2xl font-black tracking-tighter text-gradient-emerald">');

// Dashboard sub-headers
content = content.replace(/<h3 className="text-lg font-bold text-white tracking-wide">/g, '<h3 className="text-lg font-bold text-gradient tracking-wide">');
content = content.replace(/<h2 className="text-3xl font-black text-white/g, '<h2 className="text-3xl font-black text-gradient tracking-tight');
content = content.replace(/<h2 className="text-2xl sm:text-3xl font-black text-white/g, '<h2 className="text-2xl sm:text-3xl font-black text-gradient tracking-tight');

// Main big numbers (make them look luxurious)
content = content.replace(/className="text-4xl sm:text-[3.5rem] leading-none font-mono font-black text-white tracking-tight/g, 'className="text-4xl sm:text-[3.5rem] leading-none font-mono font-black text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.3)] tracking-tight');

// Rate item rows -> add hover:bg-slate-800/30
content = content.replace(/className="w-full flex items-center justify-between p-3 sm:p-4 rounded-2xl bg-slate-900\/50 border border-slate-800\/50 transition-all duration-300 hover:bg-slate-800\/80/g, 'className="w-full flex items-center justify-between p-3 sm:p-4 rounded-2xl bg-[#0f172a]/40 border border-slate-700/30 transition-all duration-300 hover:bg-[#1e293b]/60 hover-lift');

fs.writeFileSync('src/App.tsx', content);
console.log('Patched App.tsx further');
