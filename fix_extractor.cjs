const fs = require('fs');
let c = fs.readFileSync('server.ts', 'utf8');

const regex = /const results = extractRatesFromText\(text\);/m;
const replacement = `let results = extractRatesFromText(text);
      const hasCurrencyKeywords = /(?:يورو|دولار|باوند|دينار|ليرة|ذهب|فضة|كسر|مسبوك|أونصة|EUR|USD|GBP|TND|TRY|EGP)/i.test(text);
      if (hasCurrencyKeywords) {
         try {
             const aiExtracted = await extractRatesWithAI(text, "Admin Manual");
             if (aiExtracted.length > 0) {
                 const merged = [...results];
                 for (const aiRate of aiExtracted) {
                     const existingIdx = merged.findIndex(r => r.code === aiRate.code);
                     if (existingIdx >= 0) {
                         merged[existingIdx] = aiRate; 
                     } else {
                         merged.push(aiRate);
                     }
                 }
                 results = merged;
             }
         } catch (e) {
             console.error("AI extraction failed in manual API:", e);
         }
      }`;

c = c.replace(regex, replacement);

fs.writeFileSync('server.ts', c);
console.log("Done fixing extractor");
