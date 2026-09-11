const fs = require('fs');

let content = fs.readFileSync('server.ts', 'utf8');

const oldLogic = `      // التزامن مع قاعدة البيانات السحابية (Supabase)
      if (supabase) {
        supabase.from('visitor_messages').insert([{
          email,
          phone,
          message,
          status: 'new'
        }]).then(({error}) => {
          if (error) console.error("Supabase Visitor Message sync failed:", error.message);
        });
      }
      
      res.json({ success: true, message: "تم إرسال رسالتك بنجاح. سيتم الرد عليك في أقل من 24 ساعة." });`;

const newLogic = `      // التزامن مع قاعدة البيانات السحابية (Supabase)
      if (supabase) {
        supabase.from('visitor_messages').insert([{
          email,
          phone,
          message,
          status: 'new'
        }]).then(({error}) => {
          if (error) console.error("Supabase Visitor Message sync failed:", error.message);
        });
      }

      // إرسال تنبيه احترافي على تيليجرام (الرسائل المحفوظة)
      if (telegramManager && telegramManager.client && telegramManager.client.connected) {
        const tgMsg = \`📬 *رسالة جديدة من زائر*
━━━━━━━━━━━━━━━━━
👤 *البريد:* \${email}
📱 *الهاتف:* \${phone}
📝 *الرسالة:*
\${message}
━━━━━━━━━━━━━━━━━
⏰ *التوقيت:* \${new Date().toLocaleString('ar-LY', { timeZone: 'Africa/Tripoli' })}\`;

        telegramManager.sendMessage('me', tgMsg).catch(err => {
          console.error("Failed to send visitor message to Telegram Saved Messages:", err);
        });
      }
      
      res.json({ success: true, message: "تم إرسال رسالتك بنجاح. سيتم الرد عليك في أقل من 24 ساعة." });`;

content = content.replace(oldLogic, newLogic);
fs.writeFileSync('server.ts', content);
console.log('Telegram forward logic added to POST /api/messages!');
