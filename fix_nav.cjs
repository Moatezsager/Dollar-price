const fs = require('fs');
let app = fs.readFileSync('src/App.tsx', 'utf8');

const targetStr = `            {/* Tab: Converter */}
            <button
              onClick={() => { triggerHaptic(8); setActiveTab('converter'); }}
              className={\`relative flex flex-col items-center justify-center h-14 w-[72px] rounded-[1.5rem] transition-colors duration-300 active:scale-90 \${
                activeTab === 'converter' ? 'text-blue-400' : 'text-zinc-500 hover:text-zinc-400'
              }\`}
            >
              {activeTab === 'converter' && (
                <div className="absolute inset-0 bg-blue-500/10 border border-blue-500/20 rounded-[1.5rem]" />
              )}
              <Calculator className="w-5 h-5 relative z-10 mb-1" />
              <span className="text-[10px] font-bold tracking-wide relative z-10" style={{ fontFamily: 'Cairo, sans-serif' }}>المحول</span>
            </button>`;

const newTab = `
            {/* Tab: Charts */}
            <button
              onClick={() => { triggerHaptic(8); setActiveTab('charts'); }}
              className={\`relative flex flex-col items-center justify-center h-14 w-[72px] rounded-[1.5rem] transition-colors duration-300 active:scale-90 \${
                activeTab === 'charts' ? 'text-fuchsia-400' : 'text-zinc-500 hover:text-zinc-400'
              }\`}
            >
              {activeTab === 'charts' && (
                <div className="absolute inset-0 bg-fuchsia-500/10 border border-fuchsia-500/20 rounded-[1.5rem]" />
              )}
              <LineChart className="w-5 h-5 relative z-10 mb-1" />
              <span className="text-[10px] font-bold tracking-wide relative z-10" style={{ fontFamily: 'Cairo, sans-serif' }}>التحليل</span>
            </button>`;

// Replace w-[72px] with flex-1 for all nav buttons to make them fit nicely (since there are now 5)
if (app.includes(targetStr)) {
  app = app.replace(targetStr, targetStr + newTab);
  
  // Now replace w-[72px] with flex-1 inside the <nav> block
  const navStart = app.indexOf('<nav');
  const navEnd = app.indexOf('</nav>', navStart);
  
  if (navStart !== -1 && navEnd !== -1) {
    let navContent = app.substring(navStart, navEnd);
    navContent = navContent.replace(/w-\[72px\]/g, 'flex-1 mx-0.5');
    app = app.substring(0, navStart) + navContent + app.substring(navEnd);
  }

  fs.writeFileSync('src/App.tsx', app, 'utf8');
  console.log('Fixed nav');
} else {
  console.log('Could not find target string. Here is what exists near the end:');
  const match = app.match(/\{activeTab === 'converter'(.*?)<\/button>/s);
  if (match) console.log(match[0]);
}
