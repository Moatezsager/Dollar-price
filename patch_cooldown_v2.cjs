const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

if (!code.includes('let lastBroadcastState: Record<string, { price: number, time: number }> = {};')) {
    code = code.replace(
        "let lastSocialBroadcastTime = 0;",
        "let lastSocialBroadcastTime = 0;\nlet lastBroadcastState: Record<string, { price: number, time: number }> = {};"
    );
}

const targetStr = `  // --- SMART BROADCAST COOLDOWN ---
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
  // --------------------------------`;

const replacementStr = `  // --- SMART BROADCAST COOLDOWN V2 (Per Currency) ---
  if (!isTest) {
    const nowMs = Date.now();
    const qualifiedUpdates = [];
    
    for (const u of updates) {
      // Get the last broadcasted state for this specific currency. If none, assume it's oldVal and time=0
      const history = lastBroadcastState[u.id] || { price: u.oldVal, time: 0 };
      const diffFromLastBroadcast = Math.abs(u.newVal - history.price);
      const hoursSinceLast = history.time === 0 ? 999 : (nowMs - history.time) / (1000 * 60 * 60);
      
      const isMetal = u.id.startsWith('GOLD') || u.id.startsWith('SILVER');
      const pctChange = history.price > 0 ? (diffFromLastBroadcast / history.price) * 100 : 0;
      
      // The user requested >= 2 piasters (0.02)
      const hasSignificantPriceChange = isMetal ? (pctChange >= 0.4) : (diffFromLastBroadcast >= 0.02);
      
      // If 3 hours have passed since we last talked about this currency AND there's ANY change
      const hasTimePassed = hoursSinceLast >= 3 && diffFromLastBroadcast > 0;
      
      if (hasSignificantPriceChange || hasTimePassed || history.time === 0) {
        qualifiedUpdates.push(u);
      }
    }
    
    if (qualifiedUpdates.length === 0) {
      console.log(\`[Smart Broadcast] Cooldown active. Changes (< 0.02) and time (< 3 hrs). Skipping social post.\`);
      return; // Skip broadcast completely
    }
    
    // Update the global state ONLY for the currencies we are about to broadcast
    for (const u of qualifiedUpdates) {
      lastBroadcastState[u.id] = { price: u.newVal, time: nowMs };
    }
    
    // Replace updates with only the ones that qualified, so the message is clean!
    updates = qualifiedUpdates;
  }
  // ------------------------------------------------`;

if (code.includes(targetStr)) {
    code = code.replace(targetStr, replacementStr);
    fs.writeFileSync('server.ts', code, 'utf8');
    console.log("Successfully patched broadcastRateChanges for V2 cooldown.");
} else {
    console.log("Target string not found.");
}
