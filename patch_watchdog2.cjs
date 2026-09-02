const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

if (!code.includes('let lastSuccessfulFetchTime = Date.now();')) {
    code = code.replace(
        "let lastSocialBroadcastTime = 0;",
        "let lastSocialBroadcastTime = 0;\nlet lastSuccessfulFetchTime = Date.now();"
    );
}

// Find the exact return statements
const targetRegex = /return anyChanged;\s*\}\s*return false;\s*\}\s*catch\s*\(error\)\s*\{/g;
const match = targetRegex.exec(code);
if (match) {
    code = code.replace(
        targetRegex,
        "lastSuccessfulFetchTime = Date.now();\n      return anyChanged;\n    }\n    lastSuccessfulFetchTime = Date.now();\n    return false;\n  } catch (error) {"
    );
    
    const monitorStr = "// Memory Monitor";
    const watchdogStr = `// Admin Watchdog (Suggestion 2)
  setInterval(async () => {
    const libyaFormatter = new Intl.DateTimeFormat('en-US', { timeZone: 'Africa/Tripoli', hour: 'numeric', hourCycle: 'h23' });
    const currentLibyaHour = parseInt(libyaFormatter.format(new Date()), 10);
    
    // Only check during active market hours
    if (currentLibyaHour >= 9 || currentLibyaHour < 1) {
      const hoursSinceSuccess = (Date.now() - lastSuccessfulFetchTime) / (1000 * 60 * 60);
      if (hoursSinceSuccess > 4) {
        console.warn(\`[Watchdog] No successful scrape for \${hoursSinceSuccess.toFixed(1)} hours!\`);
        // Send alert to admin via saved messages if possible
        if (telegramManager && telegramManager.client && telegramManager.client.connected) {
          try {
            await telegramManager.sendMessage('me', \`⚠️ *تنبيه للمدير (Watchdog)* ⚠️\\n\\nيبدو أن هناك مشكلة في الجلب الآلي للسوق الموازي.\\nمرت أكثر من 4 ساعات دون أي عملية جلب ناجحة.\\n\\nرجاءً تحقق من حالة السيرفر أو حساب التليجرام.\`);
            // Reset to avoid spamming every minute, remind again after 4 hours
            lastSuccessfulFetchTime = Date.now();
          } catch (e) {
            console.error("[Watchdog] Failed to send alert", e);
          }
        }
      }
    }
  }, 30 * 60 * 1000); // Check every 30 minutes

  // Memory Monitor`;

    if (code.includes(monitorStr) && !code.includes('Admin Watchdog')) {
       code = code.replace(monitorStr, watchdogStr);
    }
    
    fs.writeFileSync('server.ts', code, 'utf8');
    console.log("Successfully patched watchdog 2.");
} else {
    console.log("Target regex not found.");
}
