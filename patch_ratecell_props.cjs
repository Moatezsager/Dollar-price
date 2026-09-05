const fs = require('fs');
let app = fs.readFileSync('src/App.tsx', 'utf8');

// For regular currency RateCells
const rateCellTarget1 = `                      lastChangedDate={rates?.lastChanged?.parallel[term.id]}
                      onClick={() => setSelectedRate({ code: term.id, name: term.name, market: 'parallel' })}
                    />`;
const rateCellPatch1 = `                      lastChangedDate={rates?.lastChanged?.parallel[term.id]}
                      onClick={() => setSelectedRate({ code: term.id, name: term.name, market: 'parallel' })}
                      onShare={(e) => { e.stopPropagation(); handleShareCardImage(term.id, term.name, rate, false); }}
                    />`;

app = app.split(rateCellTarget1).join(rateCellPatch1);

// For gold RateCells
const goldRateCellTarget = `                      lastChangedDate={rates?.lastChanged?.gold?.[metal.id]}
                      fallbackType="coins"
                      onClick={() => setSelectedRate({ code: metal.id, name: metal.name, market: 'parallel' })}
                    />`;
const goldRateCellPatch = `                      lastChangedDate={rates?.lastChanged?.gold?.[metal.id]}
                      fallbackType="coins"
                      onClick={() => setSelectedRate({ code: metal.id, name: metal.name, market: 'parallel' })}
                      onShare={(e) => { e.stopPropagation(); handleShareCardImage(metal.id, metal.name, rate, true); }}
                    />`;

app = app.split(goldRateCellTarget).join(goldRateCellPatch);

// Official RateCells
const officialRateCellTarget = `                      lastChangedDate={rates?.lastChanged?.official[term.id]}
                      fallbackType="building"
                      decimals={4}
                      onClick={() => setSelectedRate({ code: term.id, name: term.name, market: 'official' })}
                    />`;
const officialRateCellPatch = `                      lastChangedDate={rates?.lastChanged?.official[term.id]}
                      fallbackType="building"
                      decimals={4}
                      onClick={() => setSelectedRate({ code: term.id, name: term.name, market: 'official' })}
                      onShare={(e) => { e.stopPropagation(); handleShareCardImage(term.id, term.name, rate, false); }}
                    />`;

app = app.split(officialRateCellTarget).join(officialRateCellPatch);

fs.writeFileSync('src/App.tsx', app, 'utf8');
console.log('Patched RateCell usages');
