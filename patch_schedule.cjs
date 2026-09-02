const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const targetStr = `    // Auto-refresh rates every 10 minutes as long as server is awake
    setInterval(async () => {
      try {
        console.log("[Auto-Refresh] Triggering automatic rates update...");`;

const replacementStr = `    // Auto-refresh rates every 10 minutes as long as server is awake
    setInterval(async () => {
      try {
        // Stop fetching and publishing between 12 AM (00:00) and 6 AM (06:00) Libya time
        const libyaFormatter = new Intl.DateTimeFormat('en-US', { timeZone: 'Africa/Tripoli', hour: 'numeric', hourCycle: 'h23' });
        const currentLibyaHour = parseInt(libyaFormatter.format(new Date()), 10);
        
        if (currentLibyaHour >= 0 && currentLibyaHour < 6) {
          console.log(\`[Auto-Refresh] Skipping update during quiet hours (Current Hour: \${currentLibyaHour}:00 Libya Time). Market is sleeping.\`);
          return;
        }

        console.log("[Auto-Refresh] Triggering automatic rates update...");`;

if (code.includes(targetStr)) {
    code = code.replace(targetStr, replacementStr);
    fs.writeFileSync('server.ts', code, 'utf8');
    console.log("Successfully patched auto-refresh interval.");
} else {
    console.log("Target string not found.");
}
