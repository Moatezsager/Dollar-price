const fs = require('fs');

let content = fs.readFileSync('src/Contact.tsx', 'utf8');

// The main container has: className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-16 space-y-8"
// Let's add extra padding at the bottom for mobile so the floating nav bar doesn't cover the send button
content = content.replace(
  'className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-16 space-y-8"',
  'className="max-w-3xl mx-auto px-4 sm:px-6 py-8 pb-32 sm:py-16 sm:pb-16 space-y-6 sm:space-y-8"'
);

// We can improve the look of the inputs to make them look more premium and less cramped.
content = content.replace(
  /className="w-full bg-black\/50 border border-white\/10 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500\/50 focus:ring-1 focus:ring-emerald-500\/50 transition-all/g,
  'className="w-full bg-[#0f172a]/40 border border-slate-700/50 rounded-2xl px-4 py-3.5 sm:py-4 text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 focus:bg-[#1e293b]/60 transition-all text-base sm:text-sm'
);

// Form wrapper
content = content.replace(
  'className="bg-[#0a0a0a] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden"',
  'className="glass-panel-heavy premium-border rounded-3xl p-5 sm:p-8 shadow-2xl relative overflow-hidden"'
);

// Button
content = content.replace(
  'py-4 rounded-xl',
  'py-4 rounded-2xl text-lg'
);

fs.writeFileSync('src/Contact.tsx', content);
console.log('Contact.tsx layout patched');
