const fs = require('fs');
const content = fs.readFileSync('server.ts', 'utf-8');

// just checking if my patch caused any syntax error. Wait, if it caused a syntax error, the server wouldn't be online!
