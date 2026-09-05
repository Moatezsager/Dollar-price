const fs = require('fs');
let app = fs.readFileSync('src/App.tsx', 'utf8');

// The currencies to map:
const oldTabs = "{['USD', 'EUR', 'GBP', 'GOLD'].map(curr => (";
const newTabs = "{['USD_CASH', 'USD_CHECKS', 'EUR', 'GOLD_SCRAP_18'].map(curr => (";

// Update the labels in the map
const oldLabel = "{curr === 'GOLD' ? 'ذهب كسر 18' : curr}";
const newLabel = "{curr === 'USD_CASH' ? 'دولار كاش' : curr === 'USD_CHECKS' ? 'دولار شيك' : curr === 'EUR' ? 'يورو' : curr === 'GOLD_SCRAP_18' ? 'ذهب كسر 18' : curr}";

if (app.includes(oldTabs)) {
  app = app.replace(oldTabs, newTabs);
}
if (app.includes(oldLabel)) {
  app = app.replace(oldLabel, newLabel);
}

// Update first block of mapping (for the chart)
const oldMap1 = `                      if (chartAnalysisCurrency === 'USD') val = h.rates?.parallel?.USD || 0;
                      if (chartAnalysisCurrency === 'EUR') val = h.rates?.parallel?.EUR || 0;
                      if (chartAnalysisCurrency === 'GBP') val = h.rates?.parallel?.GBP || 0;
                      if (chartAnalysisCurrency === 'GOLD') val = h.rates?.gold?.karat18 || 0;`;

const newMap1 = `                      if (chartAnalysisCurrency === 'USD_CASH') val = h.usdParallel || h.ratesParallel?.USD || 0;
                      if (chartAnalysisCurrency === 'USD_CHECKS') val = h.ratesParallel?.USD_CHECKS || h.ratesParallel?.USD_JBANK || h.ratesParallel?.USD_NCB || 0;
                      if (chartAnalysisCurrency === 'EUR') val = h.ratesParallel?.EUR || 0;
                      if (chartAnalysisCurrency === 'GOLD_SCRAP_18') val = h.ratesParallel?.GOLD_SCRAP_18 || 0;`;

// Replace in both places (chart and stats)
// The stats mapping block is a bit different:
const oldMap2 = `                        if (chartAnalysisCurrency === 'USD') return h.rates?.parallel?.USD;
                        if (chartAnalysisCurrency === 'EUR') return h.rates?.parallel?.EUR;
                        if (chartAnalysisCurrency === 'GBP') return h.rates?.parallel?.GBP;
                        if (chartAnalysisCurrency === 'GOLD') return h.rates?.gold?.karat18;
                        return 0;`;

const newMap2 = `                        if (chartAnalysisCurrency === 'USD_CASH') return h.usdParallel || h.ratesParallel?.USD || 0;
                        if (chartAnalysisCurrency === 'USD_CHECKS') return h.ratesParallel?.USD_CHECKS || h.ratesParallel?.USD_JBANK || h.ratesParallel?.USD_NCB || 0;
                        if (chartAnalysisCurrency === 'EUR') return h.ratesParallel?.EUR || 0;
                        if (chartAnalysisCurrency === 'GOLD_SCRAP_18') return h.ratesParallel?.GOLD_SCRAP_18 || 0;
                        return 0;`;

app = app.replace(oldMap1, newMap1);
app = app.replace(oldMap2, newMap2);

// Fix initial state for chartAnalysisCurrency if needed
app = app.replace(
  "const [chartAnalysisCurrency, setChartAnalysisCurrency] = useState('USD')",
  "const [chartAnalysisCurrency, setChartAnalysisCurrency] = useState('USD_CASH')"
);

// Also fix the tooltip formatter
const oldFormatter = "formatter={(val: number) => [\\`\\${val.toFixed(2)} د.ل\\`, chartAnalysisCurrency === 'GOLD' ? 'جرام كسر 18' : chartAnalysisCurrency]}";
const newFormatter = "formatter={(val: number) => [\\`\\${val.toFixed(2)} د.ل\\`, chartAnalysisCurrency === 'USD_CASH' ? 'دولار كاش' : chartAnalysisCurrency === 'USD_CHECKS' ? 'دولار شيك' : chartAnalysisCurrency === 'EUR' ? 'يورو' : chartAnalysisCurrency === 'GOLD_SCRAP_18' ? 'ذهب كسر 18' : chartAnalysisCurrency]}";

app = app.replace(oldFormatter, newFormatter);


fs.writeFileSync('src/App.tsx', app, 'utf8');
console.log('Fixed chart logic');
