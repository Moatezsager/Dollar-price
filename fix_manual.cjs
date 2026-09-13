const fs = require('fs');
let c = fs.readFileSync('server.ts', 'utf8');

// The original cron job should be:
const cronStart = c.indexOf("cron.schedule('*/5 * * * *'");
const cronEnd = c.indexOf("});", cronStart) + 3;

const correctCron = `cron.schedule('*/5 * * * *', async () => {
  if (!appConfig.telegramAutoPost) return;
  
  const nowMs = Date.now();
  const delayedUpdates = [];
  
  for (const term of appConfig.terms) {
    const currentVal = rates.parallel[term.id];
    if (currentVal === undefined) continue;
    
    const history = lastBroadcastState[term.id] || { price: currentVal, time: 0 };
    const diff = Math.abs(currentVal - history.price);
    
    if (diff === 0) continue;
    
    const hoursSinceLastBroadcast = history.time === 0 ? 999 : (nowMs - history.time) / (1000 * 60 * 60);
    const isMetal = term.id.startsWith('GOLD') || term.id.startsWith('SILVER');
    let shouldPublish = false;
    
    if (isMetal) {
       const pctChange = history.price > 0 ? (diff / history.price) * 100 : 0;
       if (pctChange >= 0.2 && hoursSinceLastBroadcast >= 1.0) shouldPublish = true;
    } else {
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
    console.log(\`[Smart Broadcast] Found \${delayedUpdates.length} delayed updates that matured (1 hour passed). Publishing now.\`);
    await broadcastRateChanges(delayedUpdates, false, 'all');
  }
});`;

c = c.substring(0, cronStart) + correctCron + c.substring(cronEnd);

fs.writeFileSync('server.ts', c);
