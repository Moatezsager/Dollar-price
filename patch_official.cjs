const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const targetStr = `async function fetchOfficialRates(): Promise<boolean> {
  console.log("[Official] Starting official rates fetch cycle...");`;

const replacementStr = `async function fetchOfficialRates(): Promise<boolean> {
  console.log("[Official] Starting official rates fetch cycle...");

  // Stop fetching official rates on Fridays (5) and Saturdays (6)
  const libyaFormatter = new Intl.DateTimeFormat('en-US', { timeZone: 'Africa/Tripoli' });
  const dayIndex = new Date(libyaFormatter.format(new Date())).getDay();
  if (dayIndex === 5 || dayIndex === 6) {
    console.log("[Official] Skipping fetch. Official markets (CBL) are closed on Friday and Saturday.");
    return false;
  }`;

if (code.includes(targetStr)) {
    code = code.replace(targetStr, replacementStr);
    fs.writeFileSync('server.ts', code, 'utf8');
    console.log("Successfully patched fetchOfficialRates for weekend closing.");
} else {
    console.log("Target string not found.");
}
