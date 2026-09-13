const fs = require('fs');
let c = fs.readFileSync('server.ts', 'utf8');
const searchStr = 'async function broadcastRateChanges';
const start = c.indexOf(searchStr);
console.log(c.substring(start, start + 2500));
