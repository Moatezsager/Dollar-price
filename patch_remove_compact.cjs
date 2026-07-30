const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const targetCompact = `  } else if (style === "compact") {
    message += \`⚡ *موجز الأسعار* | \${timeStr}\\n\\n\`;
    for (const u of updates) {
      const isUp = u.newVal > u.oldVal;
      const isDown = u.newVal < u.oldVal;
      const fe = flagMap[u.flag] || '💰';
      const code = getCode(u);
      const icon = isUp ? '🔺' : isDown ? '🔻' : '➖';
      
      message += \`\${fe} *\${code}* \${u.newVal.toFixed(3)} \${icon} \`;
    }
    message += \`\\n\\n🌐 *للتفاصيل:* https://tinyurl.com/2j7667u2\`;
`;
code = code.replace(targetCompact, '');

const targetUrgent = `  } else if (style === "urgent") {
    message += \`🚨 *عاجل | تحديث أسعار الصرف* 🚨\\n\`;
    message += \`⏱ \${timeStr}\\n\`;
    message += \`━━━━━━━━━━━━━\\n\\n\`;
    for (const u of updates) {
      const isUp = u.newVal > u.oldVal;
      const isDown = u.newVal < u.oldVal;
      const fe = flagMap[u.flag] || '💰';
      
      const emoji = isUp ? '🔺 ارتفاع' : isDown ? '🔻 انخفاض' : '➖ استقرار';
      message += \`\${fe} *\${u.name}*: *\${u.newVal.toFixed(3)}*\\n\`;
      if (isUp || isDown) { 
        message += \`     \${emoji} (كان: \${u.oldVal.toFixed(3)})\\n\\n\`;
      } else { 
        message += \`     \${emoji}\\n\\n\`;
      }
    }
    message += \`━━━━━━━━━━━━━\\n\`;
    message += \`🌐 *المتابعة الحية:*\\n🔗 https://tinyurl.com/2j7667u2\`;
`;
code = code.replace(targetUrgent, '');

const targetMarketAlert = `  } else if (style === "market_alert") {
    message += \`🔔 *تنبيه حركة السوق* 🔔\\n\`;
    message += \`الساعة: \${timeStr}\\n\\n\`;
    for (const u of updates) {
      const isUp = u.newVal > u.oldVal;
      const isDown = u.newVal < u.oldVal;
      const fe = flagMap[u.flag] || '💰';
      const diffStr = isUp ? \`🔼 ارتفاع بمقدار \${(u.newVal - u.oldVal).toFixed(3)}\` : isDown ? \`🔽 تراجع بمقدار \${(u.oldVal - u.newVal).toFixed(3)}\` : \`استقرار\`;
      
      message += \`\${fe} *\${u.name}*: *\${u.newVal.toFixed(3)}*\\n\`;
      if (isUp || isDown) { 
        message += \`     ↳ \${diffStr}\\n\`;
      }
      message += \`\\n\`;
    }
    message += \`🌐 *التفاصيل الحية:*\\n🔗 https://tinyurl.com/2j7667u2\`;
`;
code = code.replace(targetMarketAlert, '');

fs.writeFileSync('server.ts', code);
console.log('patched server.ts to remove short telegram styles entirely');
