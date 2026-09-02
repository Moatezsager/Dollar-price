const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const targetStr = `        console.log("[Startup] Waiting 30s for system to settle and old sessions to clear...");
        await new Promise(resolve => setTimeout(resolve, 30000));
        
        console.log("[Startup] Triggering initial rates update...");
        const officialChanged = await fetchOfficialRates();
        const parallelChanged = await fetchParallelRatesFromTelegram();
        
        if (officialChanged || parallelChanged) {
          console.log("[Startup] Initial changes detected! Saving to database...");
          const saveType = (officialChanged && parallelChanged) ? 'both' : (officialChanged ? 'official' : 'parallel');
          await saveToSupabase(saveType);
          broadcastRatesUpdate(rates);
        }`;

const replacementStr = `        console.log("[Startup] Waiting 30s for system to settle and old sessions to clear...");
        await new Promise(resolve => setTimeout(resolve, 30000));
        
        const libyaFormatter = new Intl.DateTimeFormat('en-US', { timeZone: 'Africa/Tripoli', hour: 'numeric', hourCycle: 'h23' });
        const currentLibyaHour = parseInt(libyaFormatter.format(new Date()), 10);
        
        if (currentLibyaHour >= 0 && currentLibyaHour < 6) {
          console.log(\`[Startup] Skipping initial update during quiet hours (Hour \${currentLibyaHour} Libya Time). Market is sleeping.\`);
        } else {
          console.log("[Startup] Triggering initial rates update...");
          const officialChanged = await fetchOfficialRates();
          const parallelChanged = await fetchParallelRatesFromTelegram();
          
          if (officialChanged || parallelChanged) {
            console.log("[Startup] Initial changes detected! Saving to database...");
            const saveType = (officialChanged && parallelChanged) ? 'both' : (officialChanged ? 'official' : 'parallel');
            await saveToSupabase(saveType);
            broadcastRatesUpdate(rates);
          }
        }`;

if (code.includes(targetStr)) {
    code = code.replace(targetStr, replacementStr);
    fs.writeFileSync('server.ts', code, 'utf8');
    console.log("Successfully patched startup.");
} else {
    console.log("Target string not found for startup.");
}
