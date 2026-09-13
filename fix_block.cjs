const fs = require('fs');
let c = fs.readFileSync('server.ts', 'utf8');

c = c.replace(/if \(shouldPublish \|\| history\.time === 0\)\s*\{\s*qualifiedUpdates\.push\(u\);\s*\}/, 
`if (shouldPublish || history.time === 0) {
        qualifiedUpdates.push(u);
      }`);

fs.writeFileSync('server.ts', c);
