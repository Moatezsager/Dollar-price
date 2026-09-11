const fs = require('fs');

let content = fs.readFileSync('server.ts', 'utf8');

const oldTracking = `      if (/bot|crawler|spider|googlebot|bingbot/i.test(uaString)) deviceType = 'Bot';

      db.prepare(\`
        INSERT INTO analytics_events 
        (visitor_id, session_id, page_path, referrer, device_type, device_vendor, device_model, os_name, os_version, browser_name, browser_version)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      \`).run(
        visitorId, 
        sessionId || visitorId, 
        pagePath || '/', 
        referrer || '', 
        deviceType,
        result.device.vendor || '',
        result.device.model || '',
        result.os.name || '',
        result.os.version || '',
        result.browser.name || '',
        result.browser.version || ''
      );`;

const newTracking = `      // نظام حماية متقدم لمنع الروبوتات من تسجيل الزيارات (تحسين الدقة)
      const botRegex = /bot|crawler|spider|googlebot|bingbot|facebookexternalhit|Facebot|TelegramBot|Twitterbot|WhatsApp|Slackbot|Discordbot|SkypeUriPreview|LinkedInBot|Viber/i;
      if (botRegex.test(uaString) || uaString.includes('http')) {
        // نرد بنجاح ولكن لا نسجل الروبوت في قاعدة البيانات نهائياً للحفاظ على دقة الإحصائيات
        return res.json({ success: true, ignored: true, reason: 'bot_detected' });
      }

      // إدخال في سجل الزوار (الجدول المحلي)
      db.prepare(\`
        INSERT INTO analytics_events 
        (visitor_id, session_id, page_path, referrer, device_type, device_vendor, device_model, os_name, os_version, browser_name, browser_version)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      \`).run(
        visitorId, 
        sessionId || visitorId, 
        pagePath || '/', 
        referrer || '', 
        deviceType,
        result.device.vendor || '',
        result.device.model || '',
        result.os.name || '',
        result.os.version || '',
        result.browser.name || '',
        result.browser.version || ''
      );
      
      // التزامن مع Supabase لسجل الزوار (إذا كان متوفراً)
      if (supabase) {
        supabase.from('visitor_logs').insert([{
          visitor_id: visitorId,
          session_id: sessionId || visitorId,
          page_path: pagePath || '/',
          referrer: referrer || '',
          device_type: deviceType,
          os_name: result.os.name || '',
          browser_name: result.browser.name || ''
        }]).catch(e => console.error("Supabase Visitor Log sync failed:", e.message));
      }`;

content = content.replace(oldTracking, newTracking);
fs.writeFileSync('server.ts', content);
console.log('Tracking logic updated!');
