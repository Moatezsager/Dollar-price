const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');

// Replace common class patterns
const replacements = [
  {
    from: /bg-slate-900\/80\/95 backdrop-blur-xl border border-slate-700\/50/g,
    to: 'glass-panel-heavy premium-border'
  },
  {
    from: /bg-\[\#0f172a\]\/70 backdrop-blur-2xl shadow-2xl rounded-3xl border border-slate-800\/60/g,
    to: 'glass-panel-heavy rounded-3xl premium-border'
  },
  {
    from: /bg-\[\#0f172a\]\/70 backdrop-blur-2xl shadow-2xl/g,
    to: 'glass-panel-heavy premium-border'
  },
  {
    from: /bg-\[\#1e293b\]\/80 backdrop-blur-xl/g,
    to: 'glass-panel'
  },
  {
    from: /text-4xl sm:text-6xl font-black text-white/g,
    to: 'text-4xl sm:text-6xl font-black text-gradient tracking-tight'
  },
  {
    from: /text-3xl font-bold text-white/g,
    to: 'text-3xl font-bold text-gradient tracking-tight'
  },
  {
    from: /text-2xl font-bold text-white/g,
    to: 'text-2xl font-bold text-gradient tracking-tight'
  },
  {
    from: /group relative overflow-hidden rounded-3xl/g,
    to: 'group relative overflow-hidden rounded-3xl hover-lift transition-all duration-500'
  }
];

replacements.forEach(r => {
  content = content.replace(r.from, r.to);
});

fs.writeFileSync('src/App.tsx', content);

// Also do it for Admin.tsx
let adminContent = fs.readFileSync('src/Admin.tsx', 'utf8');
adminContent = adminContent.replace(/bg-slate-900\/80 border border-slate-700\/50/g, 'glass-panel premium-border');
adminContent = adminContent.replace(/bg-\[\#0f172a\]\/70 backdrop-blur-2xl shadow-2xl/g, 'glass-panel-heavy premium-border');
fs.writeFileSync('src/Admin.tsx', adminContent);

console.log('Advanced Design Patched!');
