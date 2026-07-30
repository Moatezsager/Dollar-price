const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const oldTodayStr = "const todayStr = new Date().toISOString().split('T')[0];";
const newTodayStr = "const todayStr = new Date(new Date().getTime() + 2 * 60 * 60 * 1000).toISOString().split('T')[0];";

// Replace all occurrences of todayStr calculation
code = code.split(oldTodayStr).join(newTodayStr);

fs.writeFileSync('server.ts', code);
console.log('patched todayStr to Libya time');
