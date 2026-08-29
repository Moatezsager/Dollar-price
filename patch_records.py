import re

with open("server.ts", "r") as f:
    content = f.read()

sync_code = """      // Invalidate caches
      cachedHistory = null;
      lastHistoryFetchTime = 0;
      
      try {
        const { data: latestRecord } = await supabase
          .from(table)
          .select('rates, recorded_at')
          .order('recorded_at', { ascending: false })
          .limit(1)
          .single();
          
        if (latestRecord && latestRecord.rates) {
          if (market === 'official') {
             rates.official = { ...rates.official, ...latestRecord.rates };
             rates.lastUpdated = latestRecord.recorded_at;
             rates.lastChanged.official = latestRecord.recorded_at;
          } else {
             rates.parallel = { ...rates.parallel, ...latestRecord.rates };
             rates.lastUpdated = latestRecord.recorded_at;
             rates.lastChanged.parallel = latestRecord.recorded_at;
          }
          broadcastRatesUpdate(rates);
        }
      } catch (e) {
         console.error("[DB Sync] Failed to sync latest record after admin edit:", e);
      }"""

# Replace in PUT
content = re.sub(
    r'// Invalidate caches\s+cachedHistory = null;\s+lastHistoryFetchTime = 0;\s+res\.json\(\{ success: true \}\);',
    sync_code + r'\n      res.json({ success: true });',
    content
)

with open("server.ts", "w") as f:
    f.write(content)

