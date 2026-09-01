const fs = require('fs');
let code = fs.readFileSync('src/Developers.tsx', 'utf8');
console.log(code.split('\n').slice(45, 60).join('\n'));
