const fs = require('fs');

let content = fs.readFileSync('src/Contact.tsx', 'utf8');

content = content.replace(/text-zinc-400/g, 'text-slate-400');
content = content.replace(/text-zinc-300/g, 'text-slate-300');
content = content.replace(/text-3xl sm:text-4xl font-black text-white/g, 'text-3xl sm:text-4xl font-black text-gradient');
content = content.replace(/text-2xl font-bold text-white/g, 'text-2xl font-bold text-gradient');
content = content.replace(/bg-white\/5 hover:bg-white\/10 border border-white\/10/g, 'glass-panel hover-lift');

fs.writeFileSync('src/Contact.tsx', content);
console.log('Theme patched');
