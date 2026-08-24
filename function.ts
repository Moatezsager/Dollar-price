async function broadcastOfficialRates(isTest: boolean = false) {
  if (!appConfig.telegramPostChannel || !telegramManager) {
    console.log("[Telegram Broadcast] Aborting broadcast. channel or manager missing.");
    return;
  }

  if (!isTest && !appConfig.telegramAutoPost) {
    console.log("[Telegram Broadcast] Aborting official broadcast because telegramAutoPost is disabled.");
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

  let message = `🏦 *نشرة أسعار مصرف ليبيا المركزي* 🏦\n`;
  message += `━━━━━━━━━━━━━━━━━━━\n`;
  message += `🗓 ${dayName}، ${dateStr} | ⏰ ${timeStr}\n\n`;

  for (const t of appConfig.terms) {
    if (rates.official[t.id]) {
      const val = rates.official[t.id];
      const flag = t.flag === 'us' ? '🇺🇸' : t.flag === 'eu' ? '🇪🇺' : t.flag === 'gb' ? '🇬🇧' : t.flag === 'tn' ? '🇹🇳' : t.flag === 'eg' ? '🇪🇬' : t.flag === 'tr' ? '🇹🇷' : '💰';
      message += `${flag} *${t.name}*: ${val.toFixed(4)} د.ل\n`;
    }
  }

  message += `\n━━━━━━━━━━━━━━━━━━━\n`;
  message += `🔗 *لمزيد من التفاصيل والبيانات الحية:*\n🌐 https://tinyurl.com/2j7667u2\n`;
  message += `📱 *المصدر:* مصرف ليبيا المركزي`;

  await telegramManager.sendMessage(appConfig.telegramPostChannel, message);
}

