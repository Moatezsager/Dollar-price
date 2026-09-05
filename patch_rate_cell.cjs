const fs = require('fs');
let rc = fs.readFileSync('src/components/RateCell.tsx', 'utf8');

// Add onShare to RateCellProps
if (!rc.includes('onShare?')) {
  rc = rc.replace('onClick: () => void;', 'onClick: () => void;\n  onShare?: (e: React.MouseEvent) => void;');
}

// Extract onShare
if (!rc.includes('onShare }: RateCellProps')) {
  rc = rc.replace('onClick }: RateCellProps', 'onClick, onShare }: RateCellProps');
}

// Add the share button inside the header
const shareButton = `
        {onShare && (
          <button 
            onClick={onShare}
            className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-zinc-500 hover:text-white transition-colors ml-1"
            title="مشاركة الصورة"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
          </button>
        )}
`;

const headerTarget = '<div className="flex items-center justify-between mb-3 sm:mb-4">';
const headerPatch = headerTarget + '\n      <div className="flex w-full items-center justify-between">\n        <div className="flex items-center gap-2">';

// Wait, the structure is:
/*
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <div className="flex items-center gap-2">
          <FlagIcon flagCode={term.flag} name={term.name} fallbackType={fallbackType} />
          <span className="text-[11px] font-medium text-zinc-400">{term.name}</span>
        </div>
        {trend !== undefined && ( ...
*/

const targetDiv = `        <div className="flex items-center gap-2">
          <FlagIcon flagCode={term.flag} name={term.name} fallbackType={fallbackType} />
          <span className="text-[11px] font-medium text-zinc-400">{term.name}</span>
        </div>`;

const patchedDiv = `        <div className="flex items-center gap-2">
          <FlagIcon flagCode={term.flag} name={term.name} fallbackType={fallbackType} />
          <span className="text-[11px] font-medium text-zinc-400">{term.name}</span>
        </div>
        <div className="flex items-center gap-2">
          {trend !== undefined && (
            <span className={\`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-md \${
              trend > 0 ? 'bg-rose-500/10 text-rose-500' : 'bg-emerald-500/10 text-emerald-500'
            }\`}>
              {trend > 0 ? '+' : ''}{trend.toFixed(1)}%
            </span>
          )}
          {onShare && (
            <button 
              onClick={onShare}
              className="w-6 h-6 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-zinc-500 hover:text-emerald-400 transition-colors"
              title="مشاركة الصورة"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
            </button>
          )}
        </div>`;

if (rc.includes(targetDiv)) {
  // Remove the old trend block since we are adding it inside the new flex container
  rc = rc.replace(targetDiv, patchedDiv);
  
  const oldTrendBlock = `{trend !== undefined && (
          <span className={\`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-md \${
            trend > 0 ? 'bg-rose-500/10 text-rose-500' : 'bg-emerald-500/10 text-emerald-500'
          }\`}>
            {trend > 0 ? '+' : ''}{trend.toFixed(1)}%
          </span>
        )}`;
  rc = rc.replace(oldTrendBlock, '');
}

fs.writeFileSync('src/components/RateCell.tsx', rc, 'utf8');
console.log('Patched RateCell');
