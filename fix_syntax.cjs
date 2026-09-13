const fs = require('fs');
let c = fs.readFileSync('server.ts', 'utf8');

const regex = /cron\.schedule\('\*\/5 \* \* \* \*', async \(\) => \{[\s\S]*?\}\);\s*\}\s*\}\s*if \(delayedUpdates\.length > 0\) \{[\s\S]*?\}\);/m;

const newCron = `cron.schedule('*/5 * * * *', async () => {
  if (!appConfig.telegramAutoPost) return;
  
  const currentUpdates = [];
  
  for (const term of appConfig.terms) {
    const currentVal = rates.parallel[term.id];
    if (currentVal === undefined) continue;
    
    const history = lastBroadcastState[term.id] || { price: currentVal, time: 0 };
    
    // Check if there's any change at all from the last PUBLISHED price (or initial price)
    if (currentVal !== history.price) {
      currentUpdates.push({
        id: term.id,
        name: term.name,
        oldVal: history.price,
        newVal: currentVal,
        flag: term.flag
      });
    }
  }
  
  if (currentUpdates.length > 0) {
    // Let broadcastRateChanges decide what to actually publish based on time/diff thresholds
    await broadcastRateChanges(currentUpdates, false, 'all');
  }
});`;

c = c.replace(regex, newCron);

fs.writeFileSync('server.ts', c);
