const fs = require('fs');
let c = fs.readFileSync('server.ts', 'utf8');

const regex = /const extracted = extractRatesFromText\(cleanText\);/m;
const replacement = `let extracted = extractRatesFromText(cleanText);
    const hasCurrencyKeywords = /(?:يورو|دولار|باوند|دينار|ليرة|ذهب|فضة|كسر|مسبوك|أونصة|EUR|USD|GBP|TND|TRY|EGP)/i.test(cleanText);
    if (hasCurrencyKeywords) {
       try {
           const aiExtracted = await extractRatesWithAI(cleanText, channel || "Manual Extract");
           if (aiExtracted.length > 0) {
               const merged = [...extracted];
               for (const aiRate of aiExtracted) {
                   const existingIdx = merged.findIndex(r => r.code === aiRate.code);
                   if (existingIdx >= 0) {
                       merged[existingIdx] = aiRate; 
                   } else {
                       merged.push(aiRate);
                   }
               }
               extracted = merged;
           }
       } catch (e) {
           console.error("AI extraction failed in manual-extract API:", e);
       }
    }`;

c = c.replace(regex, replacement);

fs.writeFileSync('server.ts', c);
console.log("Done fixing manual extractor");
