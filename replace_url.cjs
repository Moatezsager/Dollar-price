const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(/https:\/\/tinyurl\.com\/2j7667u2/g, 'https://dollar-price-qp14.onrender.com/');

fs.writeFileSync('server.ts', code, 'utf8');
console.log("Replaced all tinyurl links with Render URL.");
