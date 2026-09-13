const fs = require('fs');
let c = fs.readFileSync('server.ts', 'utf8');

if (!c.includes('let facebookBroadcastStatus')) {
  const afterTypes = c.indexOf('let lastBroadcastState');
  if (afterTypes !== -1) {
      c = c.substring(0, afterTypes) + "let facebookBroadcastStatus: any = { status: 'idle', lastError: '', lastErrorTime: '', lastSuccessTime: '' };\n" + c.substring(afterTypes);
      fs.writeFileSync('server.ts', c);
      console.log("Fixed facebookBroadcastStatus");
  }
}
