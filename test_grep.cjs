const fs = require('fs');
let c = fs.readFileSync('server.ts', 'utf8');
console.log(c.substring(c.indexOf('telegramUpdates.push'), c.indexOf('telegramUpdates.push') + 1000));
