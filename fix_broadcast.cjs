const fs = require('fs');
let c = fs.readFileSync('server.ts', 'utf8');

const lastBroadcastStateMatch = c.match(/let lastBroadcastState/);
if (!lastBroadcastStateMatch) {
    const afterTypes = c.indexOf('// Data Store');
    if (afterTypes !== -1) {
        c = c.substring(0, afterTypes) + 
            "// Global state for smart broadcasting\n" +
            "let lastBroadcastState: Record<string, { price: number; time: number }> = {};\n\n" + 
            c.substring(afterTypes);
    } else {
        c = "let lastBroadcastState: Record<string, { price: number; time: number }> = {};\n" + c;
    }
}

const broadcastFunction = `
async function broadcastRateChanges(updates: {id: string, name: string, oldVal: number, newVal: number, flag: string}[], isTest: boolean = false, target: string = 'all') {
  if (updates.length === 0) return;
  
  const nowMs = Date.now();
  const qualifiedUpdates = [];
  
  for (const item of updates) {
    const state = lastBroadcastState[item.id];
    
    if (!state) {
      // First time publishing this currency
      qualifiedUpdates.push(item);
      if (!isTest) lastBroadcastState[item.id] = { price: item.newVal, time: nowMs };
      continue;
    }
    
    const diff = Math.abs(item.newVal - state.price);
    const pctChange = state.price > 0 ? (diff / state.price) * 100 : 0;
    const hoursSinceLastBroadcast = (nowMs - state.time) / (1000 * 60 * 60);
    const isMetal = item.id.startsWith('GOLD') || item.id.startsWith('SILVER');
    
    // Sudden/Large Change Rule (same logic as broadcastSuddenChangeAlert for metals and currencies)
    const isSuddenChange = isMetal ? (pctChange >= 1.0) : (pctChange >= 1.0);
    
    if (isSuddenChange) {
      // Publish immediately
      qualifiedUpdates.push(item);
      if (!isTest) lastBroadcastState[item.id] = { price: item.newVal, time: nowMs };
    } else if (diff >= (isMetal ? 0.2 : 0.005) && hoursSinceLastBroadcast >= 1.0) {
      // Small change, but 1 hour has passed
      qualifiedUpdates.push(item);
      if (!isTest) lastBroadcastState[item.id] = { price: item.newVal, time: nowMs };
    } else {
      // Small change, hour not passed. Update the memory price ONLY IF we didn't just publish it 
      // (This part is tricky, the instruction said "سجّل السعر الحالي في الذاكرة لتُستخدم كمرجع للمقارنة لاحقاً 
      // لكن لا تحدّث lastBroadcastState لأنه يُحدَّث فقط عند النشر الفعلي", which contradicts itself slightly.
      // I will only update lastBroadcastState on ACTUAL publish to ensure we measure diff against the LAST PUBLISHED price.)
    }
  }

  if (qualifiedUpdates.length === 0) return;

  const now = new Date();
  const dateStr = now.toLocaleDateString('ar-LY', { timeZone: 'Africa/Tripoli' });
  const timeStr = now.toLocaleTimeString('ar-LY', { timeZone: 'Africa/Tripoli', hour: '2-digit', minute: '2-digit' });
  
  let message = isTest ? \`🛠️ *رسالة تجريبية | نظام النشر الذكي*\n\n\` : \`⏱️ *تحديث دوري لأسعار السوق الموازي*\n📅 \${dateStr} - \${timeStr}\n━━━━━━━━━━━━━━━━━\n\n\`;
  
  for (const u of qualifiedUpdates) {
    const isUp = u.newVal > u.oldVal;
    const emoji = isUp ? '📈' : (u.newVal < u.oldVal ? '📉' : '➖');
    message += \`💵 *\${u.name}*: \${u.newVal.toFixed(3)} \${emoji}\n\`;
  }
  
  message += \`\n━━━━━━━━━━━━━━━━━\n📡 *مؤشر الدينار | الدقة والسرعة*\n🔗 https://dollar-price-qp14.onrender.com/?v=\${Math.floor(Date.now() / 60000)}\`;

  try {
    await broadcastToSocialMedia(message, isTest, target);
  } catch (e) {
    console.error("[Smart Broadcast] Failed to send:", e);
    if (isTest) throw e;
  }
}
`;

const insertIndex = c.indexOf('async function broadcastDailyReport');
if (insertIndex !== -1) {
    c = c.substring(0, insertIndex) + broadcastFunction + "\n" + c.substring(insertIndex);
}

// Modify the cron job
const cronRegex = /cron\.schedule\('\*\/5 \* \* \* \*', async \(\) => \{[\s\S]*?\}\);/m;
const newCron = `cron.schedule('*/5 * * * *', async () => {
  if (!appConfig.telegramAutoPost) return;
  
  // The system's DND / quiet hours are implemented in broadcastToSocialMedia, 
  // but we can also avoid processing here if needed. Right now, broadcastRateChanges 
  // delegates to broadcastToSocialMedia which enforces the 1 AM - 9 AM quiet hours.
  
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

c = c.replace(cronRegex, newCron);

fs.writeFileSync('server.ts', c);
console.log("Done fixing broadcast logic");
