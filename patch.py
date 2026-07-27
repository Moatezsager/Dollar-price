import re

with open('server.ts', 'r', encoding='utf-8') as f:
    content = f.read()

start_marker = '  let message = "";'
end_marker = '  try {\n    const success = await telegramManager.sendMessage(appConfig.telegramPostChannel, message);'

if start_marker in content and end_marker in content:
    start_idx = content.find(start_marker)
    end_idx = content.find(end_marker)
    
    new_code = """  let message = "";

  if (style === "modern") {
    message += `📊 *مؤشر الدينار | الأسعار المحدثة*\\n`;
    message += `📅 ${dayName}، ${dateStr} | ⏰ ${timeStr}\\n`;
    message += `━━━━━━━━━━━━━━━━━━━\\n\\n`;
    
    for (const u of updates) {
      const isUp = u.newVal > u.oldVal;
      const isDown = u.newVal < u.oldVal;
      const fe = flagMap[u.flag] || '💰';
      const code = getCode(u);
      
      const diff = Math.abs(u.newVal - u.oldVal);
      
      message += `${fe} *${code}* : ${u.newVal.toFixed(3)}`;
      if (isUp) {
        message += `  (📈 +${diff.toFixed(3)})\\n`;
      } else if (isDown) {
        message += `  (📉 -${diff.toFixed(3)})\\n`;
      } else {
        message += `  (➖)\\n`;
      }
    }
    
    message += `\\n━━━━━━━━━━━━━━━━━━━\\n`;
    message += `🔗 *للتفاصيل والرسوم البيانية:*\\n🌐 https://tinyurl.com/2j7667u2`;

  } else if (style === "urgent") {
    message += `🚨 *عاجل | تحديث أسعار الصرف* 🚨\\n`;
    message += `⏱ ${timeStr}\\n`;
    message += `━━━━━━━━━━━━━\\n\\n`;
    for (const u of updates) {
      const isUp = u.newVal > u.oldVal;
      const isDown = u.newVal < u.oldVal;
      const fe = flagMap[u.flag] || '💰';
      
      const emoji = isUp ? '🔺 ارتفاع' : isDown ? '🔻 انخفاض' : '➖ استقرار';
      message += `${fe} *${u.name}*: *${u.newVal.toFixed(3)}*\\n`;
      if (isUp || isDown) {
         message += `     ${emoji} (كان: ${u.oldVal.toFixed(3)})\\n\\n`;
      } else {
         message += `     ${emoji}\\n\\n`;
      }
    }
    message += `━━━━━━━━━━━━━\\n`;
    message += `🌐 *المتابعة الحية:*\\n🔗 https://tinyurl.com/2j7667u2`;

  } else if (style === "compact") {
    message += `⚡ *موجز الأسعار* | ${timeStr}\\n\\n`;
    for (const u of updates) {
      const isUp = u.newVal > u.oldVal;
      const isDown = u.newVal < u.oldVal;
      const fe = flagMap[u.flag] || '💰';
      const code = getCode(u);
      const icon = isUp ? '🔺' : isDown ? '🔻' : '➖';
      
      message += `${fe} *${code}* ${u.newVal.toFixed(3)} ${icon} `;
    }
    message += `\\n\\n🌐 *للتفاصيل:* https://tinyurl.com/2j7667u2`;

  } else if (style === "market_alert") {
    message += `🔔 *تنبيه حركة السوق* 🔔\\n`;
    message += `الساعة: ${timeStr}\\n\\n`;
    for (const u of updates) {
      const isUp = u.newVal > u.oldVal;
      const isDown = u.newVal < u.oldVal;
      const fe = flagMap[u.flag] || '💰';
      const diffStr = isUp ? `🔼 ارتفاع بمقدار ${(u.newVal - u.oldVal).toFixed(3)}` : isDown ? `🔽 تراجع بمقدار ${(u.oldVal - u.newVal).toFixed(3)}` : `استقرار`;
      
      message += `${fe} *${u.name}*: *${u.newVal.toFixed(3)}*\\n`;
      if (isUp || isDown) { 
        message += `     ↳ ${diffStr}\\n`;
      }
      message += `\\n`;
    }
    message += `🌐 *التفاصيل الحية:*\\n🔗 https://tinyurl.com/2j7667u2`;

  } else if (style === "elegant") {
    message += `⚜️ *النشرة الاقتصادية للعملات* ⚜️\\n`;
    message += `════════════════════\\n`;
    message += `🗓 ${dayName}، ${dateStr}\\n\\n`;
    for (const u of updates) {
      const isUp = u.newVal > u.oldVal;
      const isDown = u.newVal < u.oldVal;
      const fe = flagMap[u.flag] || '💰';
      
      message += `${fe} *${u.name}*\\n`;
      message += `   السعر: *${u.newVal.toFixed(3)}* `;
      if (isUp) {
        message += `(+)\\n\\n`;
      } else if (isDown) {
        message += `(-)\\n\\n`;
      } else {
        message += `(=)\\n\\n`;
      }
    }
    message += `════════════════════\\n`;
    message += `📌 *منصة مؤشر الدينار:*\\n🌐 https://tinyurl.com/2j7667u2`;

  } else if (style === "professional") {
    message += `🏦 *مؤشر الدينار | تقرير أسعار الصرف* 🏦\\n`;
    message += `━━━━━━━━━━━━━━━━━━━\\n`;
    message += `تحديث السوق الموازية ليوم ${dayName}:\\n\\n`;
    
    for (const u of updates) {
      const isUp = u.newVal > u.oldVal;
      const isDown = u.newVal < u.oldVal;
      const fe = flagMap[u.flag] || '💰';
      const code = getCode(u);
      
      const diff = Math.abs(u.newVal - u.oldVal);
      const pct = u.oldVal > 0 ? (diff / u.oldVal) * 100 : 0;
      
      message += `${fe} *${u.name} (${code})*:\\n`;
      message += `💵 السعر: *${u.newVal.toFixed(3)} د.ل*\\n`;
      
      if (isUp) {
        message += `📈 التغير: +${diff.toFixed(3)} (+${pct.toFixed(2)}%) مقارنة بـ ${u.oldVal.toFixed(3)}\\n\\n`;
      } else if (isDown) {
        message += `📉 التغير: -${diff.toFixed(3)} (-${pct.toFixed(2)}%) مقارنة بـ ${u.oldVal.toFixed(3)}\\n\\n`;
      } else {
        message += `➖ التغير: استقرار\\n\\n`;
      }
    }
    
    message += `━━━━━━━━━━━━━━━━━━━\\n`;
    message += `⏱ وقت التحديث: ${timeStr} | ${dateStr}\\n`;
    message += `🔗 *البيانات الحية:* https://tinyurl.com/2j7667u2\\n`;
    message += `📱 *المصدر:* شبكة مراسلي مؤشر الدينار`;

  } else {
    // Classic style
    message += `📊 *نشرة أسعار الصرف* 📊\\n`;
    message += `━━━━━━━━━━━━━━━━━\\n`;
    message += `🗓️ التاريخ: ${dateStr}\\n`;
    message += `⏰ الوقت: ${timeStr}\\n`;
    message += `━━━━━━━━━━━━━━━━━\\n\\n`;
    
    for (const u of updates) {
      const isUp = u.newVal > u.oldVal;
      const isDown = u.newVal < u.oldVal;
      const diff = Math.abs(u.newVal - u.oldVal);
      let diffText = 'استقرار';
      if (isUp) diffText = `ارتفاع +${diff.toFixed(3)}`;
      if (isDown) diffText = `انخفاض -${diff.toFixed(3)}`;
      
      const fe = flagMap[u.flag] || '💰';
      
      message += `${fe} *${u.name}*: *${u.newVal.toFixed(3)}*\\n`;
      message += `   (${diffText})\\n\\n`;
    }
    
    message += `━━━━━━━━━━━━━━━━━\\n`;
    message += `🔗 *منصة مؤشر الدينار:*\\n🌐 https://tinyurl.com/2j7667u2`;
  }

"""
    
    new_content = content[:start_idx] + new_code + content[end_idx:]
    with open('server.ts', 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("Replaced successfully")
else:
    print("Markers not found")
