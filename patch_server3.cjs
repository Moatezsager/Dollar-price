const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const targetStr = `async function broadcastOfficialRates(isTest: boolean = false) {
  if (!appConfig.telegramPostChannel || !telegramManager) {
    console.log("[Telegram Broadcast] Aborting broadcast. channel or manager missing.");
    return;
  }`;

const replaceStr = `async function broadcastOfficialRates(isTest: boolean = false) {
  if (!appConfig.telegramPostChannel || !telegramManager) {
    console.log("[Telegram Broadcast] Aborting broadcast. channel or manager missing.");
    return;
  }

  if (!isTest && !appConfig.telegramAutoPost) {
    console.log("[Telegram Broadcast] Aborting official broadcast because telegramAutoPost is disabled.");
    return;
  }`;

code = code.replace(targetStr, replaceStr);

const targetCblStr = `    if (anyChanged) {
      rates.official = { ...rates.official, ...cblRates };
      rates.parallel.OFFICIAL_USD = rates.official.USD;
      rates.lastChanged.parallel.OFFICIAL_USD = new Date().toISOString();
      console.log(\`[Official] Rates updated via CBL Scraper\`);`;

const replaceCblStr = `    if (anyChanged) {
      rates.official = { ...rates.official, ...cblRates };
      rates.parallel.OFFICIAL_USD = rates.official.USD;
      rates.lastChanged.parallel.OFFICIAL_USD = new Date().toISOString();
      console.log(\`[Official] Rates updated via CBL Scraper\`);
      broadcastOfficialRates(false).catch(console.error);`;
      
code = code.replace(targetCblStr, replaceCblStr);

const targetFfStr = `        if (anyChanged) {
          rates.official = { ...rates.official, ...newOfficial };
          rates.parallel.OFFICIAL_USD = rates.official.USD;
          rates.lastChanged.parallel.OFFICIAL_USD = new Date().toISOString();
          console.log(\`[Official] Rates updated via FastForex\`);`;

const replaceFfStr = `        if (anyChanged) {
          rates.official = { ...rates.official, ...newOfficial };
          rates.parallel.OFFICIAL_USD = rates.official.USD;
          rates.lastChanged.parallel.OFFICIAL_USD = new Date().toISOString();
          console.log(\`[Official] Rates updated via FastForex\`);
          broadcastOfficialRates(false).catch(console.error);`;

code = code.replace(targetFfStr, replaceFfStr);

const targetFreeStr = `        if (anyChanged) {
          rates.official = { ...rates.official, ...newOfficial };
          rates.parallel.OFFICIAL_USD = rates.official.USD;
          rates.lastChanged.parallel.OFFICIAL_USD = new Date().toISOString();
          console.log(\`Official rates updated via \${source}\`);`;

const replaceFreeStr = `        if (anyChanged) {
          rates.official = { ...rates.official, ...newOfficial };
          rates.parallel.OFFICIAL_USD = rates.official.USD;
          rates.lastChanged.parallel.OFFICIAL_USD = new Date().toISOString();
          console.log(\`Official rates updated via \${source}\`);
          broadcastOfficialRates(false).catch(console.error);`;

code = code.replace(targetFreeStr, replaceFreeStr);

fs.writeFileSync('server.ts', code);
console.log('patched server.ts auto broadcast official rates');
