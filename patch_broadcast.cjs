const fs = require('fs');
const lines = fs.readFileSync('server.ts', 'utf8').split('\n');

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
    const success = await telegramManager.sendMessage(appConfig.telegramPostChannel, message);
    if (!success) console.error("[Telegram Broadcast] Failed to send message");
  } catch (e) {
    console.error("[Telegram Broadcast] Failed to send message:", e);
  }
}
`;

const newLines = [
  ...lines.slice(0, 1115),
  newBroadcastChanges,
  ...lines.slice(1319)
];

fs.writeFileSync('server.ts', newLines.join('\n'));
console.log('patched broadcastRateChanges');
