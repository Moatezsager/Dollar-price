
import { appConfig, isProbablyDate } from './server-logic-mock';

// Mocking the extraction logic from server.ts for testing
function extractRateMock(cleanText: string, term: any) {
  const regex = new RegExp(term.regex, 'i');
  const match = cleanText.match(regex);
  if (!match) return null;

  let valStr = null;
  const firstCapturedNum = match[1] || match[3];
  const secondCapturedNum = match[2] || match[4];
  
  if (firstCapturedNum) {
    const firstIndex = cleanText.indexOf(firstCapturedNum);
    if (isProbablyDate(cleanText, firstIndex, firstCapturedNum)) {
      if (secondCapturedNum) {
        const secondIndex = cleanText.indexOf(secondCapturedNum, firstIndex + firstCapturedNum.length);
        if (!isProbablyDate(cleanText, secondIndex, secondCapturedNum)) {
           valStr = secondCapturedNum;
        }
      }
    } else {
      const matchContent = match[0];
      const hasSellKeyword = /بيع/i.test(matchContent);
      const hasBuyKeyword = /شراء/i.test(matchContent);

      if (secondCapturedNum && hasSellKeyword && !hasBuyKeyword) {
        valStr = secondCapturedNum;
      } else if (secondCapturedNum) {
        const partAfterFirstNum = matchContent.split(firstCapturedNum)[1] || "";
        const hasCategorySeparator = /صكوك|بصك|شيك|مصرف|مقاصة|كاش|نقدي/i.test(partAfterFirstNum);
        if (!hasCategorySeparator) {
          valStr = secondCapturedNum;
        } else {
          valStr = firstCapturedNum;
        }
      } else {
        valStr = firstCapturedNum;
      }
    }
  }
  
  if (valStr) {
    let val = parseFloat(valStr.replace(',', '.'));
    if (term.id === 'TND' && val < 0.6 && val > 0) val = 1 / val;
    if (term.id === 'EGP' && val > 10.0) val = 1 / val;
    if (term.id === 'TRY' && val > 10.0) val = 1 / val;
    if (term.isInverse && val > 0) val = 1 / val;
    
    if (!isNaN(val) && val >= term.min && val <= term.max) {
       if (val > 1900 && val < 2100 && term.id !== 'GOLD' && !term.id.startsWith('GOLD_')) return null;
       return val;
    }
  }
  return null;
}

const testCases = [
  { text: "تحديث السعر اليوم 21-03-2024 دولار خضراء 7.10 كاش", expected: { USD: 7.10 } },
  { text: "الدولار مقابل الدينار: شراء 7.05 بيع 7.15", expected: { USD: 7.15 } },
  { text: "دولار كاش 7.12 صكوك الجمهورية 7.35", expected: { USD: 7.12, USD_JBANK: 7.35 } },
  { text: "سعر الذهب كسر 18 اليوم 485 دينار", expected: { GOLD_SCRAP_18: 485 } },
  { text: "2024/03/21 الساعة 15:00 دولار 7.10", expected: { USD: 7.10 } },
  { text: "يورو 7.65 7.72", expected: { EUR: 7.72 } },
  { text: "الحوالات: دبي 7.15 تركيا 7.18", expected: { USD_AE: 7.15, USD_TR: 7.18 } }
];

console.log("Running Parsing Tests...");
let passed = 0;
testCases.forEach((tc, i) => {
  console.log(`\nTest ${i+1}: "${tc.text}"`);
  let allMatched = true;
  for (const [id, expectedVal] of Object.entries(tc.expected)) {
    const term = appConfig.terms.find(t => t.id === id);
    const result = extractRateMock(tc.text, term);
    if (result === expectedVal) {
      console.log(`  ✅ ${id}: Got ${result} (Expected ${expectedVal})`);
    } else {
      console.log(`  ❌ ${id}: Got ${result} (Expected ${expectedVal})`);
      allMatched = false;
    }
  }
  if (allMatched) passed++;
});

console.log(`\nTests Completed: ${passed}/${testCases.length} passed.`);
