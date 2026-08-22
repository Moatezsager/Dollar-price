const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const targetStr = `  try {
    const success = await telegramManager.sendMessage(appConfig.telegramPostChannel, message);
    if (!success) console.error("[Telegram Broadcast] Failed to send message");
  } catch (e) {
    console.error("[Telegram Broadcast] Failed to send message:", e);
  }
}`;

const replaceStr = `  try {
    const success = await telegramManager.sendMessage(appConfig.telegramPostChannel, message);
    if (!success) console.error("[Telegram Broadcast] Failed to send message");
  } catch (e) {
    console.error("[Telegram Broadcast] Failed to send message:", e);
  }

  // SEND PUSH NOTIFICATION
  if (!isTest) {
    const mainUpdates = updates.filter(u => u.id === 'USD' || u.id === 'EUR' || u.id === 'GOLD' || u.id === 'GOLD_CAST_21').slice(0, 2);
    if (mainUpdates.length > 0) {
      const pushTitle = 'تحديث جديد لأسعار السوق';
      const pushBody = mainUpdates.map(u => \`\${u.name}: \${u.newVal.toFixed(3)}\`).join(' | ');
      sendPushNotificationToAll(pushTitle, pushBody);
    } else {
      sendPushNotificationToAll('تحديث جديد', 'تم تحديث أسعار السوق الموازي');
    }
  }
}`;

if (code.includes(targetStr)) {
  code = code.replace(targetStr, replaceStr);
  fs.writeFileSync('server.ts', code);
  console.log('Done 2');
} else {
  console.log('Target string not found');
}
