const fs = require('fs');
let c = fs.readFileSync('server.ts', 'utf8');

// 1. Fix the cron job
const cronRegex = /\/\/ Setup CRON jobs[\s\S]*?if \(delayedUpdates\.length > 0\) \{[\s\S]*?\}\n\}\);/g;

const newCron = `// Setup CRON jobs
cron.schedule('*/5 * * * *', async () => {
  if (!appConfig.telegramAutoPost) return;
  
  const nowMs = Date.now();
  const delayedUpdates = [];
  
  for (const term of appConfig.terms) {
    const currentVal = rates.parallel[term.id];
    if (currentVal === undefined) continue;
    
    // history.time holds the timestamp of the last time this currency was broadcasted
    const history = lastBroadcastState[term.id] || { price: currentVal, time: 0 };
    const diff = Math.abs(currentVal - history.price);
    
    if (diff === 0) continue;
    
    // Check time passed since LAST BROADCAST
    const hoursSinceLastBroadcast = history.time === 0 ? 999 : (nowMs - history.time) / (1000 * 60 * 60);
    
    const isMetal = term.id.startsWith('GOLD') || term.id.startsWith('SILVER');
    let shouldPublish = false;
    
    if (isMetal) {
       const pctChange = history.price > 0 ? (diff / history.price) * 100 : 0;
       if (pctChange >= 0.2 && hoursSinceLastBroadcast >= 1.0) shouldPublish = true;
    } else {
       // As per user request: if more than 1 hour passed since last broadcast, publish if diff is >= 0.005
       if (diff >= 0.005 && hoursSinceLastBroadcast >= 1.0) shouldPublish = true;
    }
    
    if (shouldPublish) {
      delayedUpdates.push({
        id: term.id,
        name: term.name,
        oldVal: history.price,
        newVal: currentVal,
        flag: term.flag,
        delayed: true
      });
    }
  }
  
  if (delayedUpdates.length > 0) {
    console.log(\`[Smart Broadcast] Found \${delayedUpdates.length} delayed updates that matured (1 hour passed since last broadcast). Publishing now.\`);
    await broadcastRateChanges(delayedUpdates, false, 'all');
  }
});`;

c = c.replace(cronRegex, newCron);

// 2. Fix the broadcastRateChanges logic
const broadcastRegex = /let shouldPublish = false;\s+if \(\(u as any\)\.delayed\) \{[\s\S]*?\}\n\s+if \(shouldPublish \|\| history\.time === 0\)/g;

const newBroadcast = `let shouldPublish = false;
            
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
      }
      
      if (shouldPublish || history.time === 0)`;

c = c.replace(broadcastRegex, newBroadcast);

fs.writeFileSync('server.ts', c);
console.log("Fixed cron and broadcast logics successfully!");

