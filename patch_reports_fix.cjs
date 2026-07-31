const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const oldDailyLoop = `
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
`;

const newDailyLoop = `
  for (const cid of mainCurrencies) {
    const stat = dailyStats[cid];
    const term = appConfig.terms.find(t => t.id === cid);
    if (term) {
      let high = stat?.count > 0 ? stat.high : (rates.parallel[cid] || 0);
      let low = stat?.count > 0 ? stat.low : (rates.parallel[cid] || 0);
      let avg = stat?.count > 0 ? (stat.sum / stat.count) : (rates.parallel[cid] || 0);
      let trend = '➖';
      if (stat?.count > 0) {
        trend = stat.high > stat.startPrice ? '📈' : (stat.low < stat.startPrice ? '📉' : '➖');
      }
      if (avg > 0) {
        message += \`💵 *\${term.name}*\\n\`;
        message += \`└ أعلى: \${high.toFixed(3)} | أدنى: \${low.toFixed(3)} | متوسط: \${avg.toFixed(3)} \${trend}\\n\\n\`;
      }
    }
  }
`;

const oldDailyGoldLoop = `
  for (const cid of goldCurrencies) {
    const stat = dailyStats[cid];
    const term = appConfig.terms.find(t => t.id === cid);
    if (stat && stat.count > 0 && term) {
      message += \`🥇 \${term.name} | أعلى: \${stat.high.toFixed(2)} | أدنى: \${stat.low.toFixed(2)}\\n\`;
    }
  }
`;

const newDailyGoldLoop = `
  for (const cid of goldCurrencies) {
    const stat = dailyStats[cid];
    const term = appConfig.terms.find(t => t.id === cid);
    if (term) {
      let high = stat?.count > 0 ? stat.high : (rates.parallel[cid] || 0);
      let low = stat?.count > 0 ? stat.low : (rates.parallel[cid] || 0);
      if (high > 0) {
        message += \`🥇 \${term.name} | أعلى: \${high.toFixed(2)} | أدنى: \${low.toFixed(2)}\\n\`;
      }
    }
  }
`;

const oldWeeklyLoop = `
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
`;

const newWeeklyLoop = `
  for (const cid of mainCurrencies) {
    const stat = weeklyStats[cid];
    const term = appConfig.terms.find(t => t.id === cid);
    if (term) {
      let avg = stat?.count > 0 ? (stat.sum / stat.count) : (rates.parallel[cid] || 0);
      let startPrice = stat ? stat.startPrice : (rates.parallel[cid] || 0);
      if (avg > 0 && startPrice > 0) {
        const pct = Math.abs(avg - startPrice) / startPrice * 100;
        let trendStr = \`➖ استقر\`;
        if (pct > 0.01) {
          trendStr = avg > startPrice ? \`📈 ارتفع \${pct.toFixed(2)}%\` : \`📉 انخفض \${pct.toFixed(2)}%\`;
        }
        message += \`💵 *\${term.name}*\\n\`;
        message += \`├ هذا الأسبوع: \${avg.toFixed(3)}\\n\`;
        message += \`├ الأسبوع الماضي: \${startPrice.toFixed(3)}\\n\`;
        message += \`└ التغيير: \${trendStr}\\n\\n\`;
      }
    }
  }
`;

const oldWeeklyGoldLoop = `
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
`;

const newWeeklyGoldLoop = `
  for (const cid of goldCurrencies) {
    const stat = weeklyStats[cid];
    const term = appConfig.terms.find(t => t.id === cid);
    if (term) {
      let avg = stat?.count > 0 ? (stat.sum / stat.count) : (rates.parallel[cid] || 0);
      let startPrice = stat ? stat.startPrice : (rates.parallel[cid] || 0);
      if (avg > 0 && startPrice > 0) {
        const pct = Math.abs(avg - startPrice) / startPrice * 100;
        let trendStr = \`➖ استقر\`;
        if (pct > 0.01) {
          trendStr = avg > startPrice ? \`📈 ارتفع \${pct.toFixed(2)}%\` : \`📉 انخفض \${pct.toFixed(2)}%\`;
        }
        message += \`🥇 \${term.name} | \${avg.toFixed(2)} \${trendStr}\\n\`;
      }
    }
  }
`;

code = code.replace(oldDailyLoop, newDailyLoop);
code = code.replace(oldDailyGoldLoop, newDailyGoldLoop);
code = code.replace(oldWeeklyLoop, newWeeklyLoop);
code = code.replace(oldWeeklyGoldLoop, newWeeklyGoldLoop);

fs.writeFileSync('server.ts', code);
console.log('patched empty count logic for reports');
