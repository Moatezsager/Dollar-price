const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// 1. Remove compact, market_alert, urgent from stylesList
code = code.replace(
  'const stylesList = ["classic", "modern", "professional", "urgent", "compact", "market_alert", "elegant"];',
  'const stylesList = ["classic", "modern", "professional", "elegant"];'
);

// 2. Remove the actual style code blocks just to be clean, or leave them (they won't be reached if not in list, but let's leave them or rewrite). Actually I'll leave the if-else for now, they just won't be selected.

// 3. Update test-broadcast to include all rates
const testBroadcastOld = `      const sampleUpdates: {id: string, name: string, oldVal: number, newVal: number, flag: string}[] = [];
      const termsToInclude = ["USD", "EUR", "GBP", "TND", "EGP"];
      for (const t of appConfig.terms) {
        if (termsToInclude.includes(t.id)) {`;

const testBroadcastNew = `      const sampleUpdates: {id: string, name: string, oldVal: number, newVal: number, flag: string}[] = [];
      for (const t of appConfig.terms) {
        if (true) {`;
code = code.replace(testBroadcastOld, testBroadcastNew);

fs.writeFileSync('server.ts', code);
console.log('patched server.ts styles and test broadcast');
