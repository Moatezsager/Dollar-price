const text = `
🟢(اليوم الأحد)2026/08/16{اخر تحديث}
⏰12:00

💵الدولار=9.10دينار🔺🔥
💰دينار.ليبي=0.345 دينار.تونسي
💰دينار.ليبي=5.50 جنيه.مصري
🪙أونصة الفضة عالمياً= 64.7$
`;

function isProbablyDateOrTime(text, index, match) { return false; }

const tndRegexStr = "(?:((?!(?:100|1)\\s*(?:=|ب|دينار|ليبي|\\-))\\d{1,3}(?:[\\.,]\\d{1,4})?)[^\\d]{0,20})?(?:TND|tnd|تونسي|تونس(?![ا-ي])|🇹🇳)[^\\d]{0,40}?(?:100|1)?\\s*(?:=|ب|\\-)?\\s*(?<!\\d)((?!(?:100|1)\\s*(?:=|ب|دينار|ليبي|\\-))\\d{1,3}(?:[\\.,]\\d{1,4})?)(?:\\s+(?:بيع|شراء)?[^\\d]{0,30}(?<!\\d)((?!(?:100|1)\\s*(?:=|ب|دينار|ليبي|\\-))\\d{1,3}(?:[\\.,]\\d{1,4})?))?";
const term = { id: 'TND', compiledRegex: new RegExp(tndRegexStr, "i") };

const match = text.match(term.compiledRegex);
console.log(match);
if (match) {
    let valStr = null;
    const firstCapturedNum = match[1] || match[3];
    const secondCapturedNum = match[2] || match[4];
    
    console.log({ firstCapturedNum, secondCapturedNum });
    if (firstCapturedNum) {
      if (secondCapturedNum) {
        const firstIndex = match.index + match[0].indexOf(firstCapturedNum);
        const secondIndex = match.index + match[0].indexOf(secondCapturedNum);
        const textBetween = text.substring(firstIndex + firstCapturedNum.length, secondIndex);
        
        const isDifferentCurrency = /[\n=💶💷💎🪙]/.test(textBetween) || 
                                    /(?:يورو|دولار|باوند|دينار|ليرة|ذهب|فضة|كسر|مسبوك|أونصة|عالميا|EUR|USD|GBP|TND|TRY|EGP)/i.test(textBetween);

        console.log({ textBetween, isDifferentCurrency });
        if (isProbablyDateOrTime(text, secondIndex, secondCapturedNum) || isDifferentCurrency) {
          valStr = firstCapturedNum;
        } else {
          valStr = secondCapturedNum;
        }
      } else {
        valStr = firstCapturedNum;
      }
    } else if (secondCapturedNum) {
      // wait, what if firstCapturedNum is undefined? 
      // if match[1] is undefined, firstCapturedNum will be match[3] which is undefined.
      valStr = secondCapturedNum;
    }
    console.log("Extracted:", valStr);
}
