const fs = require('fs');
let server = fs.readFileSync('server.ts', 'utf8');

const target1 = `async function fetchOfficialRates(): Promise<boolean> {
  console.log("[Official] Starting official rates fetch cycle...");

  // Stop fetching official rates on Fridays (5) and Saturdays (6)
  const libyaFormatter = new Intl.DateTimeFormat('en-US', { timeZone: 'Africa/Tripoli' });
  const dayIndex = new Date(libyaFormatter.format(new Date())).getDay();
  if (dayIndex === 5 || dayIndex === 6) {
    console.log("[Official] Skipping fetch. Official markets (CBL) are closed on Friday and Saturday.");
    return false;
  }
  // 1. Try CBL Website First (Most Accurate for Libya)
  const cblRates = await fetchFromCBL();
  if (cblRates) {
    let anyChanged = false;
    Object.entries(cblRates).forEach(([key, val]) => {`;

const replace1 = `let lastOfficialFetchDate = "";

async function fetchOfficialRates(): Promise<boolean> {
  console.log("[Official] Starting official rates fetch cycle...");

  const libyaFormatter = new Intl.DateTimeFormat('en-US', { timeZone: 'Africa/Tripoli' });
  const now = new Date();
  const dayIndex = new Date(libyaFormatter.format(now)).getDay();
  
  // Create YYYY-MM-DD for Libya
  const libyaDateObj = new Date(now.toLocaleString('en-US', { timeZone: 'Africa/Tripoli' }));
  const yyyy = libyaDateObj.getFullYear();
  const mm = String(libyaDateObj.getMonth() + 1).padStart(2, '0');
  const dd = String(libyaDateObj.getDate()).padStart(2, '0');
  const currentLibyaDate = \`\${yyyy}-\${mm}-\${dd}\`;

  if (lastOfficialFetchDate === currentLibyaDate) {
    console.log(\`[Official] Already successfully updated rates for today (\${currentLibyaDate}). Skipping.\`);
    return false;
  }

  // Stop fetching official rates on Fridays (5) and Saturdays (6)
  if (dayIndex === 5 || dayIndex === 6) {
    console.log("[Official] Skipping fetch. Official markets (CBL) are closed on Friday and Saturday.");
    return false;
  }

  // 1. Try CBL Website First (Most Accurate for Libya)
  const cblResult = await fetchFromCBL();
  if (cblResult) {
    const { cblDate, rates: cblRates } = cblResult;
    let anyChanged = false;
    Object.entries(cblRates).forEach(([key, val]) => {`;

const target2 = `    if (anyChanged) {
      rates.official = { ...rates.official, ...cblRates };
      rates.parallel.OFFICIAL_USD = rates.official.USD;
      rates.lastChanged.parallel.OFFICIAL_USD = new Date().toISOString();
      console.log(\`[Official] Rates updated via CBL Scraper\`);
      broadcastOfficialRates(false).catch(console.error);
    }
    return anyChanged;
  }`;

const replace2 = `    if (anyChanged) {
      rates.official = { ...rates.official, ...cblRates };
      rates.parallel.OFFICIAL_USD = rates.official.USD;
      rates.lastChanged.parallel.OFFICIAL_USD = new Date().toISOString();
      console.log(\`[Official] Rates updated via CBL Scraper\`);
      broadcastOfficialRates(false).catch(console.error);
    }
    
    // If the CBL website has published today's rates, we stop checking for the rest of the day
    if (cblDate === currentLibyaDate) {
      console.log(\`[Official] CBL published rates for today (\${cblDate}). Locking updates until tomorrow.\`);
      lastOfficialFetchDate = currentLibyaDate;
    }
    
    return anyChanged;
  }`;

if (server.includes(target1) && server.includes(target2)) {
  server = server.replace(target1, replace1);
  server = server.replace(target2, replace2);
  fs.writeFileSync('server.ts', server, 'utf8');
  console.log('Patched fetchOfficialRates');
} else {
  console.log('Still not found');
}
