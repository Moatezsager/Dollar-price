const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

if (!code.includes('import cron from "node-cron"')) {
  code = code.replace('import "dotenv/config";', 'import "dotenv/config";\nimport cron from "node-cron";');
}

const statsCode = `
interface CurrencyStat {
  high: number;
  low: number;
  sum: number;
  count: number;
  startPrice: number;
}
const dailyStats: Record<string, CurrencyStat> = {};
const weeklyStats: Record<string, CurrencyStat> = {};

function initStatsIfEmpty(termId: string, val: number) {
  if (!dailyStats[termId]) {
    dailyStats[termId] = { high: val, low: val, sum: 0, count: 0, startPrice: val };
  }
  if (!weeklyStats[termId]) {
    weeklyStats[termId] = { high: val, low: val, sum: 0, count: 0, startPrice: val };
  }
}

function updateStats(termId: string, val: number) {
  if (val <= 0) return;
  initStatsIfEmpty(termId, val);
  
  if (val > dailyStats[termId].high) dailyStats[termId].high = val;
  if (val < dailyStats[termId].low) dailyStats[termId].low = val;
  dailyStats[termId].sum += val;
  dailyStats[termId].count++;

  if (val > weeklyStats[termId].high) weeklyStats[termId].high = val;
  if (val < weeklyStats[termId].low) weeklyStats[termId].low = val;
  weeklyStats[termId].sum += val;
  weeklyStats[termId].count++;
}

async function broadcastSuddenChangeAlert(u: {id?: string, name: string, oldVal: number, newVal: number, flag: string}) {
  if (!appConfig.telegramPostChannel || !telegramManager || !appConfig.telegramAutoPost) return;
  const pct = Math.abs(u.newVal - u.oldVal) / u.oldVal * 100;
  if (pct < 1.0) return; // 1% threshold
  
  const isUp = u.newVal > u.oldVal;
  let message = \`🚨 *تنبيه عاجل | تغيير مفاجئ* 🚨\\n\\n\`;
  message += \`العملة: *\${u.name}*\\n\`;
  message += \`السعر الجديد: *\${u.newVal.toFixed(3)}*\\n\`;
  message += \`السعر القديم: \${u.oldVal.toFixed(3)}\\n\`;
  message += \`نسبة التغيير: \${isUp ? '📈 ارتفع' : '📉 انخفض'} بمقدار \${pct.toFixed(2)}%\\n\\n\`;
  message += \`🔗 التفاصيل: https://tinyurl.com/2j7667u2\`;
  
  try {
    await telegramManager.sendMessage(appConfig.telegramPostChannel, message);
  } catch (e) {
    console.error("[Telegram] Failed to send sudden alert:", e);
  }
}

async function broadcastDailyReport() {
  if (!appConfig.telegramPostChannel || !telegramManager || !appConfig.telegramAutoPost) return;
  const now = new Date();
  const dateStr = now.toLocaleDateString('ar-LY', { timeZone: 'Africa/Tripoli' });
  
  let message = \`📊 *المؤشر | تقرير نهاية اليوم*\\n📅 \${dateStr}\\n━━━━━━━━━━━━━━━━━\\n\\n\`;
  
  const mainCurrencies = ['USD', 'USD_CHECKS', 'EUR', 'GBP'];
  const goldCurrencies = ['GOLD_CAST_24', 'GOLD_CAST_21', 'GOLD_CAST_18', 'GOLD'];
  
  for (const cid of mainCurrencies) {
    const stat = dailyStats[cid];
    const term = appConfig.terms.find(t => t.id === cid);
    if (stat && stat.count > 0 && term) {
      const avg = stat.sum / stat.count;
      const trend = stat.high > stat.startPrice ? '📈' : (stat.low < stat.startPrice ? '📉' : '➖');
      message += \`💵 *\${term.name}*\\n\`;
      message += \`└ أعلى: \${stat.high.toFixed(3)} | أدنى: \${stat.low.toFixed(3)} | متوسط: \${avg.toFixed(3)} \${trend}\\n\\n\`;
    }
  }
  
  message += \`━━━━━━━━━━━━━━━━━\\n\`;
  for (const cid of goldCurrencies) {
    const stat = dailyStats[cid];
    const term = appConfig.terms.find(t => t.id === cid);
    if (stat && stat.count > 0 && term) {
      message += \`🥇 \${term.name} | أعلى: \${stat.high.toFixed(2)} | أدنى: \${stat.low.toFixed(2)}\\n\`;
    }
  }
  
  message += \`━━━━━━━━━━━━━━━━━\\n📡 *مؤشر الدينار | الدقة والسرعة*\\n🔗 https://tinyurl.com/2j7667u2\`;
  
  try {
    await telegramManager.sendMessage(appConfig.telegramPostChannel, message);
  } catch(e) {}
  
  // Reset daily stats
  for (const key in dailyStats) {
    dailyStats[key].high = rates.parallel[key] || 0;
    dailyStats[key].low = rates.parallel[key] || 0;
    dailyStats[key].sum = 0;
    dailyStats[key].count = 0;
    dailyStats[key].startPrice = rates.parallel[key] || 0;
  }
}

async function broadcastWeeklyReport() {
  if (!appConfig.telegramPostChannel || !telegramManager || !appConfig.telegramAutoPost) return;
  const now = new Date();
  const dateStr = now.toLocaleDateString('ar-LY', { timeZone: 'Africa/Tripoli' });
  const pastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toLocaleDateString('ar-LY', { timeZone: 'Africa/Tripoli' });
  
  let message = \`📊 *المؤشر | تقرير الأسبوع*\\n📅 \${pastWeek} — \${dateStr}\\n━━━━━━━━━━━━━━━━━\\n\\n\`;
  
  const mainCurrencies = ['USD', 'USD_CHECKS', 'EUR', 'GBP'];
  const goldCurrencies = ['GOLD_CAST_24', 'GOLD_CAST_21', 'GOLD_CAST_18', 'GOLD'];
  
  for (const cid of mainCurrencies) {
    const stat = weeklyStats[cid];
    const term = appConfig.terms.find(t => t.id === cid);
    if (stat && stat.count > 0 && term) {
      const avg = stat.sum / stat.count;
      const pct = stat.startPrice > 0 ? Math.abs(avg - stat.startPrice) / stat.startPrice * 100 : 0;
      const trendStr = avg > stat.startPrice ? \`📈 ارتفع \${pct.toFixed(2)}%\` : (avg < stat.startPrice ? \`📉 انخفض \${pct.toFixed(2)}%\` : \`➖ استقر\`);
      message += \`💵 *\${term.name}*\\n\`;
      message += \`├ هذا الأسبوع: \${avg.toFixed(3)}\\n\`;
      message += \`├ الأسبوع الماضي: \${stat.startPrice.toFixed(3)}\\n\`;
      message += \`└ التغيير: \${trendStr}\\n\\n\`;
    }
  }
  
  message += \`━━━━━━━━━━━━━━━━━\\n\`;
  for (const cid of goldCurrencies) {
    const stat = weeklyStats[cid];
    const term = appConfig.terms.find(t => t.id === cid);
    if (stat && stat.count > 0 && term) {
      const avg = stat.sum / stat.count;
      const pct = stat.startPrice > 0 ? Math.abs(avg - stat.startPrice) / stat.startPrice * 100 : 0;
      const trendStr = avg > stat.startPrice ? \`📈 ارتفع \${pct.toFixed(2)}%\` : (avg < stat.startPrice ? \`📉 انخفض \${pct.toFixed(2)}%\` : \`➖ استقر\`);
      message += \`🥇 \${term.name} | \${avg.toFixed(2)} \${trendStr}\\n\`;
    }
  }
  
  message += \`━━━━━━━━━━━━━━━━━\\n📡 *مؤشر الدينار | الدقة والسرعة*\\n🔗 https://tinyurl.com/2j7667u2\`;
  
  try {
    await telegramManager.sendMessage(appConfig.telegramPostChannel, message);
  } catch(e) {}
  
  // Reset weekly stats
  for (const key in weeklyStats) {
    weeklyStats[key].high = rates.parallel[key] || 0;
    weeklyStats[key].low = rates.parallel[key] || 0;
    weeklyStats[key].sum = 0;
    weeklyStats[key].count = 0;
    weeklyStats[key].startPrice = rates.parallel[key] || 0;
  }
}

// Setup CRON jobs
cron.schedule('59 23 * * *', () => {
  broadcastDailyReport().catch(console.error);
}, {
  scheduled: true,
  timezone: "Africa/Tripoli"
});

cron.schedule('55 23 * * 5', () => {
  broadcastWeeklyReport().catch(console.error);
}, {
  scheduled: true,
  timezone: "Africa/Tripoli"
});
`;

if (!code.includes('const dailyStats: Record<string, CurrencyStat> = {};')) {
  code = code.replace('let appConfig: AppConfig = {', statsCode + '\nlet appConfig: AppConfig = {');
}

fs.writeFileSync('server.ts', code);
console.log('Stats code added');
