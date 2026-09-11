const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');

// Replace standard solid/basic backgrounds with premium glass panels
content = content.replace(/className="([^"]*)bg-\[\#0f172a\]\/70 backdrop-blur-2xl shadow-2xl rounded-3xl border border-slate-800\/60([^"]*)"/g, 'className="$1 glass-panel-heavy rounded-3xl premium-border $2"');
content = content.replace(/className="([^"]*)bg-\[\#0f172a\]\/70 backdrop-blur-2xl shadow-2xl([^"]*)"/g, 'className="$1 glass-panel-heavy premium-border $2"');

content = content.replace(/bg-slate-900\/80 border border-slate-700\/50/g, 'glass-panel premium-border');
content = content.replace(/bg-\[\#1e293b\]\/60 backdrop-blur-xl/g, 'glass-panel');
content = content.replace(/bg-slate-900 border-white\/5/g, 'glass-panel');

// Let's also upgrade the header text styles
content = content.replace(/text-4xl sm:text-6xl font-black text-white/g, 'text-4xl sm:text-6xl font-black text-gradient');
content = content.replace(/text-3xl font-bold text-white/g, 'text-3xl font-bold text-gradient');
content = content.replace(/text-2xl sm:text-3xl font-bold text-white/g, 'text-2xl sm:text-3xl font-bold text-gradient');

// Upgrade headers in main sections
content = content.replace(/<h2 className="text-2xl font-bold text-white mb-2">/g, '<h2 className="text-2xl font-bold text-gradient mb-2">');
content = content.replace(/<h2 className="text-2xl font-bold text-white">/g, '<h2 className="text-2xl font-bold text-gradient">');

// Apply hover-lift to cards
content = content.replace(/className="([^"]*)group relative overflow-hidden([^"]*)"/g, 'className="$1group relative overflow-hidden hover-lift $2"');

fs.writeFileSync('src/App.tsx', content);
console.log('Patched cards in App.tsx');
