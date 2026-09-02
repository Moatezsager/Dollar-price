const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const targetStr = `    await broadcastToSocialMedia(message, typeof isTest !== "undefined" ? isTest : false);
    if (!isTest) {
      lastOfficialBroadcastDate = dateStr;
    }`;

const replacementStr = `    // Send only to Telegram, disable Facebook for official rates to prevent spamming
    await broadcastToSocialMedia(message, typeof isTest !== "undefined" ? isTest : false, 'telegram');
    if (!isTest) {
      lastOfficialBroadcastDate = dateStr;
    }`;

if (code.includes(targetStr)) {
    code = code.replace(targetStr, replacementStr);
    fs.writeFileSync('server.ts', code, 'utf8');
    console.log("Successfully patched Facebook broadcast.");
} else {
    console.log("Target string not found.");
}
