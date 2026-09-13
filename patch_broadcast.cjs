const fs = require('fs');
let c = fs.readFileSync('server.ts', 'utf8');

const regex = /let shouldPublish = false;[\s\S]*?if \(\(u as any\)\.delayed\) \{[\s\S]*?shouldPublish = true;[\s\S]*?\} else \{[\s\S]*?if \(isMetal\) \{[\s\S]*?if \(pctChange >= 0\.4\) shouldPublish = true; \/\/ تغير كبير للذهب[\s\S]*?\} else \{[\s\S]*?if \(diffFromLastBroadcast >= 0\.02\) shouldPublish = true; \/\/ فرق قرشين ينشر دائما[\s\S]*?\}[\s\S]*?\}/;

const newBlock = `let shouldPublish = false;
      
      if ((u as any).delayed) {
         // This is a delayed update coming from the cron job (meaning 1 hour has already passed)
         shouldPublish = true;
      } else {
        if (isMetal) {
           if (pctChange >= 0.4) shouldPublish = true; // تغير كبير للذهب
           else if (pctChange >= 0.2 && hoursSinceLast >= 1.0) shouldPublish = true; // اذا مر ساعة
        } else {
           if (diffFromLastBroadcast >= 0.02) shouldPublish = true; // فرق قرشين ينشر دائما
           else if (diffFromLastBroadcast >= 0.005 && hoursSinceLast >= 1.0) shouldPublish = true; // فرق بسيط بس مرت ساعة
        }
      }`;

if(regex.test(c)) {
   c = c.replace(regex, newBlock);
   fs.writeFileSync('server.ts', c);
   console.log("Broadcast Rate Changes logic successfully patched.");
} else {
   console.log("Could not find broadcastRateChanges logic to replace.");
}
