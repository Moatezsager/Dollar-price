const fs = require('fs');
let c = fs.readFileSync('server.ts', 'utf8');

const regex = /\} else if \(diff >= \(isMetal \? 0\.2 : 0\.005\) && hoursSinceLastBroadcast >= 1\.0\) \{/g;
const replacement = '} else if (diff > 0 && hoursSinceLastBroadcast >= 1.0) {';

c = c.replace(regex, replacement);
fs.writeFileSync('server.ts', c);
