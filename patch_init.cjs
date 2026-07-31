const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const targetStr = `  // Populate memory rates from DB
  if (parallelData && parallelData.length > 0) {
    const latest = parallelData[0];`;

const initStatsStr = `
    for (const key in latest.rates) {
      if (latest.rates[key] > 0) {
        initStatsIfEmpty(key, latest.rates[key]);
      }
    }
`;

if (code.includes(targetStr) && !code.includes('initStatsIfEmpty(key, latest.rates[key]);')) {
  code = code.replace(targetStr, targetStr + initStatsStr);
  fs.writeFileSync('server.ts', code);
  console.log('patched initStatsIfEmpty');
} else {
  console.log('could not find target or already patched');
}
