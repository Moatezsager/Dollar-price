const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const targetStr = `  console.log("Server initialized and listening");
  // Try to perform a scrape on startup if memory is empty
  // (usually memory is populated from Supabase, but if it's empty, we should scrape)`;

const initStatsStr = `
  for (const key in rates.parallel) {
    if (rates.parallel[key] > 0) {
      initStatsIfEmpty(key, rates.parallel[key]);
    }
  }
`;

if (code.includes(targetStr) && !code.includes('initStatsIfEmpty(key, rates.parallel[key])')) {
  code = code.replace(targetStr, initStatsStr + '\n' + targetStr);
  fs.writeFileSync('server.ts', code);
  console.log('patched initStatsIfEmpty at startServer');
} else {
  console.log('could not find target or already patched');
}
