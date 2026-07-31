const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const targetStr = `        // 1. Load latest rates from Supabase immediately to ensure we have the latest prices
        await loadLatestRatesFromSupabase();`;

const initStatsStr = `
        for (const key in rates.parallel) {
          if (rates.parallel[key] > 0) {
            initStatsIfEmpty(key, rates.parallel[key]);
          }
        }
`;

if (code.includes(targetStr) && !code.includes('initStatsIfEmpty(key, rates.parallel[key])')) {
  code = code.replace(targetStr, targetStr + initStatsStr);
  fs.writeFileSync('server.ts', code);
  console.log('patched initStatsIfEmpty after loadLatestRatesFromSupabase');
} else {
  console.log('could not find target or already patched');
}
