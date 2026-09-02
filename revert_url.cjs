const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(/https:\/\/dollar-price-qp14\.onrender\.com\//g, 'https://tinyurl.com/2j7667u2');

fs.writeFileSync('server.ts', code, 'utf8');
console.log("Reverted Render URLs back to tinyurl in server.ts.");
