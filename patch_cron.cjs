const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

const oldLogic = `      // 2. تغيير بقرش واحد (0.01) فأكثر: ينشر بشرط مرور ساعة كاملة.
      
      let shouldPublish = false;
      
      if (isMetal) {
         if (pctChange >= 0.4) shouldPublish = true; // تغير كبير للذهب
         if (pctChange >= 0.2 && hoursSinceLast >= 1.0) shouldPublish = true; // تغير طفيف بعد مرور ساعة
      } else {
         if (diffFromLastBroadcast >= 0.02) shouldPublish = true; // فرق قرشين ينشر دائما
         if (diffFromLastBroadcast >= 0.01 && hoursSinceLast >= 1.0) shouldPublish = true; // فرق قرش بعد مرور ساعة
      }`;

const newLogic = `      // 2. تغيير بقرش واحد (0.01) فأكثر: ينشر بشرط مرور ساعة كاملة.
      // ملاحظة: يتم التحقق من مرور الساعة بناءً على "آخر تحديث للعملة" عبر وظيفة المراقبة الدورية (Cron)
      
      let shouldPublish = false;
      
      if ((u as any).delayed) {
         // This is a delayed update coming from the cron job (meaning 1 hour has already passed since currency was updated)
         shouldPublish = true;
      } else {
        if (isMetal) {
           if (pctChange >= 0.4) shouldPublish = true; // تغير كبير للذهب
        } else {
           if (diffFromLastBroadcast >= 0.02) shouldPublish = true; // فرق قرشين ينشر دائما
        }
      }`;

content = content.replace(oldLogic, newLogic);

const cronTarget = `// Setup CRON jobs`;
const newCron = `// Setup CRON jobs
cron.schedule('*/5 * * * *', async () => {
  if (!appConfig.telegramAutoPost) return;
  
  const nowMs = Date.now();
  const delayedUpdates = [];
  
  for (const term of appConfig.terms) {
    const currentVal = rates.parallel[term.id];
    if (currentVal === undefined) continue;
    
    const history = lastBroadcastState[term.id] || { price: currentVal, time: 0 };
    const diff = Math.abs(currentVal - history.price);
    
    if (diff === 0) continue;
    
    const lastChangedIso = rates.lastChanged.parallel[term.id];
    if (!lastChangedIso) continue;
    
    const lastChangedMs = new Date(lastChangedIso).getTime();
    const hoursSinceLastChange = (nowMs - lastChangedMs) / (1000 * 60 * 60);
    
    const isMetal = term.id.startsWith('GOLD') || term.id.startsWith('SILVER');
    let shouldPublish = false;
    
    if (isMetal) {
       const pctChange = history.price > 0 ? (diff / history.price) * 100 : 0;
       if (pctChange >= 0.2 && hoursSinceLastChange >= 1.0) shouldPublish = true;
    } else {
       if (diff >= 0.01 && hoursSinceLastChange >= 1.0) shouldPublish = true;
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
    console.log(\`[Smart Broadcast] Found \${delayedUpdates.length} delayed updates that matured (1 hour passed since price change). Publishing now.\`);
    await broadcastRateChanges(delayedUpdates, false, 'all');
  }
});
`;

content = content.replace(cronTarget, newCron);

fs.writeFileSync('server.ts', content);
console.log('Successfully patched broadcast with delayed cron check!');
