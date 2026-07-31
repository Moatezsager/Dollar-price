const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const oldWarn = `    console.warn("[Scraper] Failed to fetch any messages from any channels.");
    const channelList = channels.join(', ');
    const usedSources = usedGramJs ? (canUseHttpScraper ? "GramJS -> HTTP Fallback" : "GramJS (No Fallback)") : (forceHttpScraper ? "HTTP (Forced)" : "None");
    await logErrorArabic(\`فشل الكاشط في جلب أي بيانات من جميع القنوات (\${channels.length} قناة)\`, "الكاشط", \`القنوات: \${channelList}\\nالمصادر المستخدمة: \${usedSources}\\nإجمالي الرسائل: \${totalMessagesProcessed}\`);`;

const newWarn = `    console.warn("[Scraper] Failed to fetch any messages from any channels (They might be empty or blocked).");`;

code = code.replace(oldWarn, newWarn);
fs.writeFileSync('server.ts', code);
console.log('Patched scraper log');
