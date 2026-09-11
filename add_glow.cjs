const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');

const target = `<div className="min-h-screen bg-[#020617] text-white font-sans selection:bg-emerald-500/20 relative overflow-hidden" dir="rtl">`;
const replacement = `<div className="min-h-screen bg-[#020617] text-white font-sans selection:bg-emerald-500/20 relative overflow-hidden" dir="rtl">
        {/* Ambient Background Glows */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-500/5 rounded-full blur-[150px] pointer-events-none" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none mix-blend-overlay" />
`;

if (content.includes(target) && !content.includes('Ambient Background Glows')) {
  content = content.replace(target, replacement);
  fs.writeFileSync('src/App.tsx', content);
  console.log('Added ambient glows to App.tsx');
} else {
  console.log('Target not found or already added');
}
