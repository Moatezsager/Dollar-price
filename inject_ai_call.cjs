const fs = require('fs');

let code = fs.readFileSync('server.ts', 'utf8');

const target1 = `              const extracted = extractRatesFromText(cleanText);
              
              const feedMsg: LiveFeedMessage = {`;
const replace1 = `              let extracted = extractRatesFromText(cleanText);
              const hasCurrencyKeywords = /(?:يورو|دولار|باوند|دينار|ليرة|ذهب|فضة|كسر|مسبوك|أونصة|EUR|USD|GBP|TND|TRY|EGP)/i.test(cleanText);
              if (hasCurrencyKeywords && cleanText.length > 10 && cleanText.length < 800) {
                 const aiExtracted = await extractRatesWithAI(cleanText, channel);
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
              }
              
              const feedMsg: LiveFeedMessage = {`;

code = code.replace(target1, replace1);

const target2 = `                  const extracted = extractRatesFromText(cleanText);
                  
                  const feedMsg: LiveFeedMessage = {`;
const replace2 = `                  let extracted = extractRatesFromText(cleanText);
                  const hasCurrencyKeywords = /(?:يورو|دولار|باوند|دينار|ليرة|ذهب|فضة|كسر|مسبوك|أونصة|EUR|USD|GBP|TND|TRY|EGP)/i.test(cleanText);
                  if (hasCurrencyKeywords && cleanText.length > 10 && cleanText.length < 800) {
                     const aiExtracted = await extractRatesWithAI(cleanText, channel);
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
                  }
                  
                  const feedMsg: LiveFeedMessage = {`;

code = code.replace(target2, replace2);

fs.writeFileSync('server.ts', code);
console.log("Injected AI calls.");
