const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const pushFunc = `
async function sendPushNotificationToAll(title: string, body: string, url: string = '/') {
  try {
    const subscriptions = db.prepare('SELECT endpoint, p256dh, auth FROM push_subscriptions').all();
    if (!subscriptions || subscriptions.length === 0) return;
    
    console.log(\`[Push] Sending alert to \${subscriptions.length} users.\`);
    const payload = JSON.stringify({ title, body, url });
    
    for (const sub of subscriptions as any[]) {
      try {
        await webpush.sendNotification({
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth }
        }, payload);
      } catch (err: any) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          db.prepare('DELETE FROM push_subscriptions WHERE endpoint = ?').run(sub.endpoint);
        }
      }
    }
  } catch (err) {
    console.error('[Push] Broadcast error:', err);
  }
}
`;

// Insert pushFunc after sendRetentionPushNotifications
code = code.replace(/function sendRetentionPushNotifications\(\) \{[\s\S]*?\}\n/, match => match + '\n' + pushFunc);

// Insert call in broadcastSuddenChangeAlert
const alertCode = `  try {
    await telegramManager.sendMessage(appConfig.telegramPostChannel, message);
  } catch (e) {
    console.error("[Telegram] Failed to send sudden alert:", e);
  }

  // SEND PUSH NOTIFICATION
  const pushTitle = \`🚨 تغيير في \${u.name}\`;
  const pushBody = \`السعر الجديد: \${u.newVal.toFixed(3)} (\${isUp ? '📈 ارتفع' : '📉 انخفض'})\`;
  sendPushNotificationToAll(pushTitle, pushBody);
}`;

code = code.replace(/  try \{\s+await telegramManager\.sendMessage\(appConfig\.telegramPostChannel, message\);\s+\} catch \(e\) \{\s+console\.error\("\[Telegram\] Failed to send sudden alert:", e\);\s+\}\s+\}/, alertCode);

fs.writeFileSync('server.ts', code);
console.log('Done');
