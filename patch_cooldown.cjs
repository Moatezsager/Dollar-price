const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

if (!code.includes('let lastSocialBroadcastTime = 0;')) {
    code = code.replace(
        "let telegramManager: TelegramManager | null = null;",
        "let lastSocialBroadcastTime = 0;\nlet telegramManager: TelegramManager | null = null;"
    );
}

const targetStr = `  const timeStr = now.toLocaleTimeString('ar-LY', { timeZone: 'Africa/Tripoli', hour: '2-digit', minute: '2-digit' });
  
  const dayNames = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];`;

const replacementStr = `  const timeStr = now.toLocaleTimeString('ar-LY', { timeZone: 'Africa/Tripoli', hour: '2-digit', minute: '2-digit' });
  
  // --- SMART BROADCAST COOLDOWN ---
  if (!isTest) {
    const nowMs = Date.now();
    const hoursSinceLast = lastSocialBroadcastTime === 0 ? 3 : (nowMs - lastSocialBroadcastTime) / (1000 * 60 * 60);
    
    let hasSignificantChange = false;
    for (const u of updates) {
      const diff = Math.abs(u.newVal - u.oldVal);
      const pct = u.oldVal > 0 ? (diff / u.oldVal) * 100 : 0;
      // Threshold: Change >= 0.03 LYD (for USD/EUR/GBP) OR >= 0.5% (for Gold/Silver)
      if (diff >= 0.03 || pct >= 0.5) {
        hasSignificantChange = true;
        break;
      }
    }
    
    // If it's been less than 2 hours AND no significant changes, skip posting
    if (hoursSinceLast < 2 && !hasSignificantChange) {
      console.log(\`[Smart Broadcast] Cooldown active (\${hoursSinceLast.toFixed(1)} hrs). No major changes detected. Skipping social post.\`);
      return;
    }
    lastSocialBroadcastTime = nowMs;
  }
  // --------------------------------

  const dayNames = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];`;

if (code.includes(targetStr)) {
    code = code.replace(targetStr, replacementStr);
    fs.writeFileSync('server.ts', code, 'utf8');
    console.log("Successfully patched broadcastRateChanges for cooldown.");
} else {
    console.log("Target string not found for cooldown.");
}
