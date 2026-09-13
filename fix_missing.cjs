const fs = require('fs');
let c = fs.readFileSync('server.ts', 'utf8');

const missingCode = `
// cron.schedule('59 23 * * *', () => {
//   broadcastDailyReport().catch(console.error);
// }, {
//   scheduled: true,
//   timezone: "Africa/Tripoli"
// });

cron.schedule('55 23 * * 5', () => {
  broadcastWeeklyReport().catch(console.error);
}, {
  scheduled: true,
  timezone: "Africa/Tripoli"
});

let appConfig: AppConfig = {
  channels: ["dollarr_ly", "musheermarket", "lydollar", "suqalmushir"],
  telegramPostChannel: "lydollar",
  telegramAutoPost: false,
  telegramTemplateStyle: "classic",
  enableHttpScraper: true,
  enableUserTracking: true,
  apiConfig: {
    enabled: true,
    rateLimitWindowMs: 60000,
    rateLimitMaxRequests: 20,
    banDurationMinutes: 5,
  },
  terms: [
    { id: "USD", name: "دولار أمريكي", regex: "(?:USD|usd|الدولار|دولار|الخضراء|خضراء|كاش|💵|🇺🇸)(?!\\\\s*صكوك|\\\\s*بصك|\\\\s*شيك)[^\\\\d]{0,40}(\\\\d{1,2}(?:[\\\\.,]\\\\d{1,4})?)(?:\\\\s+(?:بيع|شراء)?[^\\\\d]{0,15}(\\\\d{1,2}(?:[\\\\.,]\\\\d{1,4})?))?", min: 5.0, max: 25.0, isInverse: false, flag: "us" },
    { id: "EUR", name: "يورو", regex: "(?:EUR|eur|يورو|اليورو|💶|🇪🇺)[^\\\\d]{0,40}(\\\\d{1,2}(?:[\\\\.,]\\\\d{1,4})?)(?:\\\\s+(?:بيع|شراء)?[^\\\\d]{0,15}(\\\\d{1,2}(?:[\\\\.,]\\\\d{1,4})?))?", min: 5.0, max: 25.0, isInverse: false, flag: "eu" },
    { id: "GBP", name: "جنيه إسترليني", regex: "(?:GBP|gbp|باوند|استرليني|الباوند|💷|🇬🇧)[^\\\\d]{0,40}(\\\\d{1,2}(?:[\\\\.,]\\\\d{1,4})?)(?:\\\\s+(?:بيع|شراء)?[^\\\\d]{0,15}(\\\\d{1,2}(?:[\\\\.,]\\\\d{1,4})?))?", min: 5.0, max: 25.0, isInverse: false, flag: "gb" },
    { id: "TND", name: "دينار تونسي", regex: "(?:TND|tnd|تونسي|تونس(?![ا-ي])|🇹🇳)[^\\\\d]{0,40}?(?:100|1)?\\\\s*(?:=|ب|\\\\-)?\\\\s*(?<!\\\\d)((?!(?:100|1)\\\\s*(?:=|ب|دينار|ليبي|\\\\-))\\\\d{1,3}(?:[\\\\.,]\\\\d{1,4})?)(?:\\\\s+(?:بيع|شراء)?[^\\\\d]{0,30}(?<!\\\\d)((?!(?:100|1)\\\\s*(?:=|ب|دينار|ليبي|\\\\-))\\\\d{1,3}(?:[\\\\.,]\\\\d{1,4})?))?", min: 0.1, max: 400.0, isInverse: false, flag: "tn" },
    { id: "EGP", name: "جنيه مصري", regex: "(?:EGP|egp|مصري|مصر(?![ا-ي])|🇪🇬)[^\\\\d]{0,40}?(?:100|1)?\\\\s*(?:=|ب|\\\\-)?\\\\s*(?<!\\\\d)((?!(?:100|1)\\\\s*(?:=|ب|دينار|ليبي|\\\\-))\\\\d{1,3}(?:[\\\\.,]\\\\d{1,4})?)(?:\\\\s+(?:بيع|شراء)?[^\\\\d]{0,30}(?<!\\\\d)((?!(?:100|1)\\\\s*(?:=|ب|دينار|ليبي|\\\\-))\\\\d{1,3}(?:[\\\\.,]\\\\d{1,4})?))?", min: 0.01, max: 5.0, isInverse: false, flag: "eg" },
    { id: "TRY", name: "ليرة تركية", regex: "(?:TRY|try|ليرة(?!\\\\s*ذهب)|(?<!حوالة\\\\s*)(?<!حوالات\\\\s*)تركي(?![ا-ي])|🇹🇷)[^\\\\d]{0,40}?(?:100|1)?\\\\s*(?:=|ب|\\\\-)?\\\\s*(?<!\\\\d)((?!(?:100|1)\\\\s*(?:=|ب|دينار|ليبي|\\\\-))\\\\d{1,3}(?:[\\\\.,]\\\\d{1,4})?)(?:\\\\s+(?:بيع|شراء)?[^\\\\d]{0,30}(?<!\\\\d)((?!(?:100|1)\\\\s*(?:=|ب|دينار|ليبي|\\\\-))\\\\d{1,3}(?:[\\\\.,]\\\\d{1,4})?))?", min: 0.01, max: 5.0, isInverse: false, flag: "tr" },
    { id: "JOD", name: "دينار أردني", regex: "(?:JOD|jod|أردني|🇯🇴)[^\\\\d]{0,40}(\\\\d{1,2}(?:[\\\\.,]\\\\d{1,4})?)(?:\\\\s+(?:بيع|شراء)?[^\\\\d]{0,15}(\\\\d{1,2}(?:[\\\\.,]\\\\d{1,4})?))?", min: 5.0, max: 30.0, isInverse: false, flag: "jo" },
    { id: "BHD", name: "دينار بحريني", regex: "(?:BHD|bhd|بحريني|🇧🇭)[^\\\\d]{0,40}(\\\\d{1,2}(?:[\\\\.,]\\\\d{1,4})?)(?:\\\\s+(?:بيع|شراء)?[^\\\\d]{0,15}(\\\\d{1,2}(?:[\\\\.,]\\\\d{1,4})?))?", min: 10.0, max: 50.0, isInverse: false, flag: "bh" },
    { id: "KWD", name: "دينار كويتي", regex: "(?:KWD|kwd|كويتي|🇰🇼)[^\\\\d]{0,40}(\\\\d{1,2}(?:[\\\\.,]\\\\d{1,4})?)(?:\\\\s+(?:بيع|شراء)?[^\\\\d]{0,15}(\\\\d{1,2}(?:[\\\\.,]\\\\d{1,4})?))?", min: 10.0, max: 60.0, isInverse: false, flag: "kw" },
    { id: "AED", name: "درهم إماراتي", regex: "(?:AED|aed|اماراتي|إماراتي|🇦🇪)[^\\\\d]{0,40}(\\\\d{1,2}(?:[\\\\.,]\\\\d{1,4})?)(?:\\\\s+(?:بيع|شراء)?[^\\\\d]{0,15}(\\\\d{1,2}(?:[\\\\.,]\\\\d{1,4})?))?", min: 1.0, max: 20.0, isInverse: false, flag: "ae" },
    { id: "SAR", name: "ريال سعودي", regex: "(?:SAR|sar|سعودي|🇸🇦)[^\\\\d]{0,40}(\\\\d{1,2}(?:[\\\\.,]\\\\d{1,4})?)(?:\\\\s+(?:بيع|شراء)?[^\\\\d]{0,15}(\\\\d{1,2}(?:[\\\\.,]\\\\d{1,4})?))?", min: 1.0, max: 20.0, isInverse: false, flag: "sa" },
    { id: "QAR", name: "ريال قطري", regex: "(?:QAR|qar|قطري|🇶🇦)[^\\\\d]{0,40}(\\\\d{1,2}(?:[\\\\.,]\\\\d{1,4})?)(?:\\\\s+(?:بيع|شراء)?[^\\\\d]{0,15}(\\\\d{1,2}(?:[\\\\.,]\\\\d{1,4})?))?", min: 1.0, max: 20.0, isInverse: false, flag: "qa" },
    { id: "CNY", name: "يوان صيني", regex: "(?:CNY|cny|صيني|🇨🇳)[^\\\\d]{0,40}(\\\\d{1,2}(?:[\\\\.,]\\\\d{1,4})?)(?:\\\\s+(?:بيع|شراء)?[^\\\\d]{0,15}(\\\\d{1,2}(?:[\\\\.,]\\\\d{1,4})?))?", min: 0.1, max: 5.0, isInverse: false, flag: "cn" },
    { id: "GOLD_CAST_24", name: "ذهب كسر 24", regex: "(?:ذهب\\\\s+كسر\\\\s+24|كسر\\\\s+24)[^\\\\d]{0,40}?(\\\\d{3}(?:[\\\\.,]\\\\d{1,4})?)", min: 100.0, max: 1000.0, isInverse: false, flag: "gold" },
    { id: "GOLD_CAST_21", name: "ذهب كسر 21", regex: "(?:ذهب\\\\s+كسر\\\\s+21|كسر\\\\s+21)[^\\\\d]{0,40}?(\\\\d{3}(?:[\\\\.,]\\\\d{1,4})?)", min: 100.0, max: 1000.0, isInverse: false, flag: "gold" },
    { id: "GOLD_CAST_18", name: "ذهب كسر 18", regex: "(?:ذهب\\\\s+كسر\\\\s+18|كسر\\\\s+18)[^\\\\d]{0,40}?(\\\\d{3}(?:[\\\\.,]\\\\d{1,4})?)", min: 100.0, max: 1000.0, isInverse: false, flag: "gold" },
    { id: "GOLD", name: "ذهب جديد", regex: "(?:GOLD|gold|ذهب(?![\\\\s_]*كسر)|الذهب(?![\\\\s_]*كسر)|✨)(?!\\\\s*كسر)[^\\\\d]{0,40}(\\\\d{3}(?:[\\\\.,]\\\\d{1,4})?)(?:\\\\s+(?:بيع|شراء)?[^\\\\d]{0,15}(\\\\d{3}(?:[\\\\.,]\\\\d{1,4})?))?", min: 100.0, max: 1000.0, isInverse: false, flag: "gold" },
    { id: "SILVER", name: "فضة كسر", regex: "(?:SILVER|silver|فضة|الفضة|🪙)[^\\\\d]{0,40}(\\\\d{1,2}(?:[\\\\.,]\\\\d{1,4})?)(?:\\\\s+(?:بيع|شراء)?[^\\\\d]{0,15}(\\\\d{1,2}(?:[\\\\.,]\\\\d{1,4})?))?", min: 1.0, max: 50.0, isInverse: false, flag: "silver" }
  ]
};

function loadConfigFromStorage() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const db = new Database(DB_FILE);
      const row = db.prepare("SELECT data FROM kv_store WHERE key = 'appConfig'").get() as any;
      if (row) {
        applyConfig(JSON.parse(row.data), 'LocalSQLite');
      }
      db.close();
    }
  } catch (error) {
    console.error("[Config] Error loading from SQLite:", error);
  }
}

function applyConfig(loadedConfig: Partial<AppConfig>, source: string) {
  if (!loadedConfig) return;
  
  const existingIds = new Set(loadedConfig.terms?.map((t: any) => t.id) || []);
  let mergedTerms = loadedConfig.terms || [];
`;

// we need to insert missingCode right after the cron job ends.
const cronEndCode = \`  if (delayedUpdates.length > 0) {
    console.log(\\\`[Smart Broadcast] Found \\\${delayedUpdates.length} delayed updates that matured (1 hour passed). Publishing now.\\\`);
    await broadcastRateChanges(delayedUpdates, false, 'all');
  }
});\`;

const insertIndex = c.indexOf(cronEndCode) + cronEndCode.length;

if (c.indexOf(cronEndCode) !== -1) {
  c = c.substring(0, insertIndex) + '\\n' + missingCode + c.substring(insertIndex);
  fs.writeFileSync('server.ts', c);
  console.log("Successfully restored missing code");
} else {
  console.log("Could not find insertion point!");
}
