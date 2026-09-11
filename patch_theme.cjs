const fs = require('fs');

function patchFile(filepath) {
  let content = fs.readFileSync(filepath, 'utf8');
  
  // Base Layout
  content = content.replace(/bg-\[\#050505\]/g, 'bg-[#020617]'); // slate-950
  
  // Cards & Modals (glassmorphism)
  content = content.replace(/bg-\[\#0a0a0a\]/g, 'bg-[#0f172a]/70 backdrop-blur-2xl shadow-2xl'); // slate-900 with heavy blur
  content = content.replace(/bg-\[\#111\]/g, 'bg-[#1e293b]/60 backdrop-blur-xl');
  content = content.replace(/bg-\[\#1a1a1a\]/g, 'bg-[#1e293b]/80 backdrop-blur-xl');
  
  // Zinc -> Slate for a cooler, more professional dark mode
  content = content.replace(/bg-zinc-900/g, 'bg-slate-900/80');
  content = content.replace(/bg-zinc-800/g, 'bg-slate-800');
  content = content.replace(/text-zinc-400/g, 'text-slate-400');
  content = content.replace(/text-zinc-500/g, 'text-slate-500');
  content = content.replace(/text-zinc-300/g, 'text-slate-300');
  content = content.replace(/text-zinc-200/g, 'text-slate-200');
  
  // Borders
  content = content.replace(/border-white\/5/g, 'border-slate-800/60');
  content = content.replace(/border-white\/10/g, 'border-slate-700/50');
  content = content.replace(/border-white\/20/g, 'border-slate-600/50');
  
  // Accent colors (Emerald is good, but let's make it glow more)
  content = content.replace(/shadow-\[0_8px_30px_rgb\(0,0,0,0\.12\)\]/g, 'shadow-[0_8px_30px_rgb(0,0,0,0.4)]');
  
  fs.writeFileSync(filepath, content);
  console.log('Patched ' + filepath);
}

patchFile('src/App.tsx');
patchFile('src/Admin.tsx');

let css = fs.readFileSync('src/index.css', 'utf8');
css = css.replace(/background-color: #050505;/g, 'background-color: #020617; /* slate-950 */\n  background-image: radial-gradient(circle at 50% 0%, #0f172a 0%, transparent 70%);\n  background-attachment: fixed;');
fs.writeFileSync('src/index.css', css);
console.log('Patched index.css');
