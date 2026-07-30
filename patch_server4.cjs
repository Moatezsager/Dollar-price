const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const oldBroadcastChanges = code.substring(
  code.indexOf('async function broadcastRateChanges'),
  code.indexOf('async function broadcastOfficialRates')
);

const newBroadcastChanges = `async function broadcastRateChanges(updates: {id?: string, name: string, oldVal: number, newVal: number, flag: string}[], isTest: boolean = false) {
  if (!appConfig.telegramPostChannel || !telegramManager) {
    return;
  }
  if (!isTest && !appConfig.telegramAutoPost) {
    return;
  }
  if (updates.length === 0) {
    return;
  }
  
  const now = new Date();
  const dateStr = now.toLocaleDateString('ar-LY', { timeZone: 'Africa/Tripoli' });
  const timeStr = now.toLocaleTimeString('ar-LY', { timeZone: 'Africa/Tripoli', hour: '2-digit', minute: '2-digit' });
  
  const dayNames = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
  let dayName = "الخميس";
  try {
    const dayIndex = new Date(now.toLocaleString('en-US', { timeZone: 'Africa/Tripoli' })).getDay();
    dayName = dayNames[dayIndex];
  } catch (e) {}

  const flagMap: Record<string, string> = {
    'us': '🇺🇸', 'eu': '🇪🇺', 'gb': '🇬🇧', 'tn': '🇹🇳', 'eg': '🇪🇬', 
    'tr': '🇹🇷', 'ly': '🇱🇾', 'jo': '🇯🇴', 'bh': '🇧🇭', 'kw': '🇰🇼',
    'ae': '🇦🇪', 'sa': '🇸🇦', 'qa': '🇶🇦', 'cn': '🇨🇳'
  };

  let message = \`📊 *مؤشر الدينار | تحديث السوق الموازي*\\n\`;
  message += \`━━━━━━━━━━━━━━━━━━━\\n\`;
  message += \`📅 \${dayName}، \${dateStr} | ⏰ \${timeStr}\\n\\n\`;

  for (const u of updates) {
    const isUp = u.newVal > u.oldVal;
    const isDown = u.newVal < u.oldVal;
    const diff = Math.abs(u.newVal - u.oldVal);
    const fe = flagMap[u.flag] || '💰';
    
    let changeText = '➖ استقرار';
    if (isUp) changeText = \`🔺 ارتفاع بمقدار \${diff.toFixed(3)}\`;
    if (isDown) changeText = \`🔻 انخفاض بمقدار \${diff.toFixed(3)}\`;

    message += \`\${fe} *\${u.name}*\\n\`;
    message += \`💵 السعر: *\${u.newVal.toFixed(3)} د.ل*\\n\`;
    if (isUp || isDown) {
      message += \`📊 التغير: \${changeText} (كان \${u.oldVal.toFixed(3)})\\n\\n\`;
    } else {
      message += \`📊 التغير: \${changeText}\\n\\n\`;
    }
  }

  message += \`━━━━━━━━━━━━━━━━━━━\\n\`;
  message += \`🔗 *المتابعة الحية والرسوم البيانية:*\\n\`;
  message += \`🌐 https://tinyurl.com/2j7667u2\\n\`;
  message += \`📱 *المصدر:* شبكة مؤشر الدينار\`;

  try {
    await telegramManager.sendMessage(appConfig.telegramPostChannel, message);
  } catch (e) {
    console.error("[Telegram Broadcast] Failed to send message:", e);
  }
}

`;

code = code.replace(oldBroadcastChanges, newBroadcastChanges);

const oldOfficialBroadcast = code.substring(
  code.indexOf('async function broadcastOfficialRates'),
  code.indexOf('  app.post("/api/admin/telegram/official-broadcast"')
);

const newOfficialBroadcast = `async function broadcastOfficialRates(isTest: boolean = false) {
  if (!appConfig.telegramPostChannel || !telegramManager) {
    return;
  }
  if (!isTest && !appConfig.telegramAutoPost) {
    return;
  }

  const now = new Date();
  const dateStr = now.toLocaleDateString('ar-LY', { timeZone: 'Africa/Tripoli' });
  const timeStr = now.toLocaleTimeString('ar-LY', { timeZone: 'Africa/Tripoli', hour: '2-digit', minute: '2-digit' });
  
  const dayNames = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
  let dayName = "الخميس";
  try {
    const dayIndex = new Date(now.toLocaleString('en-US', { timeZone: 'Africa/Tripoli' })).getDay();
    dayName = dayNames[dayIndex];
  } catch (e) {}

  let message = \`🏛 *نشرة أسعار مصرف ليبيا المركزي* 🏛\\n\`;
  message += \`━━━━━━━━━━━━━━━━━━━\\n\`;
  message += \`📅 \${dayName}، \${dateStr} | ⏰ \${timeStr}\\n\\n\`;

  for (const t of appConfig.terms) {
    if (rates.official[t.id]) {
      const val = rates.official[t.id];
      const flag = t.flag === 'us' ? '🇺🇸' : t.flag === 'eu' ? '🇪🇺' : t.flag === 'gb' ? '🇬🇧' : t.flag === 'tn' ? '🇹🇳' : t.flag === 'eg' ? '🇪🇬' : t.flag === 'tr' ? '🇹🇷' : '💰';
      message += \`\${flag} *\${t.name}*\\n\`;
      message += \`💵 السعر: *\${val.toFixed(4)} د.ل*\\n\\n\`;
    }
  }

  message += \`━━━━━━━━━━━━━━━━━━━\\n\`;
  message += \`🔗 *لمزيد من التفاصيل والبيانات الحية:*\\n\`;
  message += \`🌐 https://tinyurl.com/2j7667u2\\n\`;
  message += \`📱 *المصدر:* مصرف ليبيا المركزي\`;

  try {
    await telegramManager.sendMessage(appConfig.telegramPostChannel, message);
  } catch (e) {
    console.error("[Telegram Broadcast] Failed to send official message:", e);
  }
}

`;

code = code.replace(oldOfficialBroadcast, newOfficialBroadcast);

fs.writeFileSync('server.ts', code);
console.log('patched server.ts with clean modern styles');
