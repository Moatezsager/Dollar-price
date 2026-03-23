const appConfig = {
  terms: [
    { id: "USD", name: "دولار أمريكي", regex: "(?:USD|usd|الدولار|دولار|الخضراء|خضراء|كاش|💵|🇺🇸)(?!\\s*صكوك|\\s*بصك|\\s*شيك)[^\\d]{0,40}(\\d{1,2}(?:[\\.,]\\d{1,4})?)(?:\\s+(?:بيع|شراء)?[^\\d]{0,15}(\\d{1,2}(?:[\\.,]\\d{1,4})?))?", min: 5.0, max: 25.0, isInverse: false, flag: "us" },
    { id: "EUR", name: "يورو", regex: "(?:EUR|eur|يورو|اليورو|💶|🇪🇺)[^\\d]{0,40}(\\d{1,2}(?:[\\.,]\\d{1,4})?)(?:\\s+(?:بيع|شراء)?[^\\d]{0,15}(\\d{1,2}(?:[\\.,]\\d{1,4})?))?", min: 5.0, max: 25.0, isInverse: false, flag: "eu" },
    { id: "GBP", name: "جنيه إسترليني", regex: "(?:GBP|gbp|باوند|استرليني|الباوند|💷|🇬🇧)[^\\d]{0,40}(\\d{1,2}(?:[\\.,]\\d{1,4})?)(?:\\s+(?:بيع|شراء)?[^\\d]{0,15}(\\d{1,2}(?:[\\.,]\\d{1,4})?))?", min: 5.0, max: 25.0, isInverse: false, flag: "gb" },
    { id: "TND", name: "دينار تونسي", regex: "(?:TND|tnd|تونسي|تونس(?![ا-ي])|🇹🇳)[^\\d]{0,40}(\\d{1,2}(?:[\\.,]\\d{1,4})?)(?:\\s+(?:بيع|شراء)?[^\\d]{0,15}(\\d{1,2}(?:[\\.,]\\d{1,4})?))?", min: 0.1, max: 10.0, isInverse: false, flag: "tn" },
    { id: "EGP", name: "جنيه مصري", regex: "(?:EGP|egp|مصري|مصر(?![ا-ي])|🇪🇬)[^\\d]{0,40}(\\d{1,2}(?:[\\.,]\\d{1,4})?)(?:\\s+(?:بيع|شراء)?[^\\d]{0,15}(\\d{1,2}(?:[\\.,]\\d{1,4})?))?", min: 0.01, max: 5.0, isInverse: false, flag: "eg" },
    { id: "TRY", name: "ليرة تركية", regex: "(?:TRY|try|ليرة(?!\\s*ذهب)|تركي(?![ا-ي])|🇹🇷)[^\\d]{0,40}(\\d{1,2}(?:[\\.,]\\d{1,4})?)(?:\\s+(?:بيع|شراء)?[^\\d]{0,15}(\\d{1,2}(?:[\\.,]\\d{1,4})?))?", min: 0.01, max: 5.0, isInverse: false, flag: "tr" },
    { id: "JOD", name: "دينار أردني", regex: "(?:JOD|jod|أردني|🇯🇴)[^\\d]{0,40}(\\d{1,2}(?:[\\.,]\\d{1,4})?)(?:\\s+(?:بيع|شراء)?[^\\d]{0,15}(\\d{1,2}(?:[\\.,]\\d{1,4})?))?", min: 5.0, max: 30.0, isInverse: false, flag: "jo" },
    { id: "BHD", name: "دينار بحريني", regex: "(?:BHD|bhd|بحريني|🇧🇭)[^\\d]{0,40}(\\d{1,2}(?:[\\.,]\\d{1,4})?)(?:\\s+(?:بيع|شراء)?[^\\d]{0,15}(\\d{1,2}(?:[\\.,]\\d{1,4})?))?", min: 10.0, max: 50.0, isInverse: false, flag: "bh" },
    { id: "KWD", name: "دينار كويتي", regex: "(?:KWD|kwd|كويتي|🇰🇼)[^\\d]{0,40}(\\d{1,2}(?:[\\.,]\\d{1,4})?)(?:\\s+(?:بيع|شراء)?[^\\d]{0,15}(\\d{1,2}(?:[\\.,]\\d{1,4})?))?", min: 10.0, max: 60.0, isInverse: false, flag: "kw" },
    { id: "AED", name: "درهم إماراتي", regex: "(?:AED|aed|إماراتي|امارات|🇦🇪)[^\\d]{0,40}(\\d{0,2}(?:[\\.,]\\d{1,4})?)(?:\\s+(?:بيع|شراء)?[^\\d]{0,15}(\\d{0,2}(?:[\\.,]\\d{1,4})?))?", min: 0.5, max: 10.0, isInverse: false, flag: "ae" },
    { id: "SAR", name: "ريال سعودي", regex: "(?:SAR|sar|سعودي|ريال|🇸🇦)[^\\d]{0,40}(\\d{0,2}(?:[\\.,]\\d{1,4})?)(?:\\s+(?:بيع|شراء)?[^\\d]{0,15}(\\d{0,2}(?:[\\.,]\\d{1,4})?))?", min: 0.5, max: 10.0, isInverse: false, flag: "sa" },
    { id: "QAR", name: "ريال قطري", regex: "(?:QAR|qar|قطري|🇶🇦)[^\\d]{0,40}(\\d{0,2}(?:[\\.,]\\d{1,4})?)(?:\\s+(?:بيع|شراء)?[^\\d]{0,15}(\\d{0,2}(?:[\\.,]\\d{1,4})?))?", min: 0.5, max: 10.0, isInverse: false, flag: "qa" },
    { id: "USD_JBANK", name: "صكوك الجمهورية", regex: "(?:jbank|الجمهورية|صكوك الجمهورية|بصك الجمهورية)[^\\d]{0,40}(\\d{1,2}(?:[\\.,]\\d{1,4})?)(?:\\s+(?:بيع|شراء)?[^\\d]{0,15}(\\d{1,2}(?:[\\.,]\\d{1,4})?))?", min: 5.0, max: 25.0, isInverse: false, flag: "us" },
    { id: "USD_BCD", name: "صكوك التجارة", regex: "(?:bcd|التجارة والتنمية|صكوك التجارة|بصك التجارة)[^\\d]{0,40}(\\d{1,2}(?:[\\.,]\\d{1,4})?)(?:\\s+(?:بيع|شراء)?[^\\d]{0,15}(\\d{1,2}(?:[\\.,]\\d{1,4})?))?", min: 5.0, max: 25.0, isInverse: false, flag: "us" },
    { id: "USD_NCB", name: "صكوك التجاري", regex: "(?:NCB|التجاري الوطني|صكوك التجاري|بصك التجاري)[^\\d]{0,40}(\\d{1,2}(?:[\\.,]\\d{1,4})?)(?:\\s+(?:بيع|شراء)?[^\\d]{0,15}(\\d{1,2}(?:[\\.,]\\d{1,4})?))?", min: 5.0, max: 25.0, isInverse: false, flag: "us" },
    { id: "USD_AB", name: "صكوك الأمان", regex: "(?:AB|الأمان|الامان|صكوك الأمان|صكوك الامان)[^\\d]{0,40}(\\d{1,2}(?:[\\.,]\\d{1,4})?)(?:\\s+(?:بيع|شراء)?[^\\d]{0,15}(\\d{1,2}(?:[\\.,]\\d{1,4})?))?", min: 5.0, max: 25.0, isInverse: false, flag: "us" },
    { id: "USD_WB", name: "صكوك الوحدة", regex: "(?:WB|الوحدة|صكوك الوحدة|بصك الوحدة)[^\\d]{0,40}(\\d{1,2}(?:[\\.,]\\d{1,4})?)(?:\\s+(?:بيع|شراء)?[^\\d]{0,15}(\\d{1,2}(?:[\\.,]\\d{1,4})?))?", min: 5.0, max: 25.0, isInverse: false, flag: "us" },
    { id: "USD_AE", name: "حوالات دبي", regex: "(?:دبي|امارات|الإمارات|حوالة دبي|حوالات دبي|🇦🇪)[^\\d]{0,40}(\\d{1,2}(?:[\\.,]\\d{1,4})?)(?:\\s+(?:بيع|شراء)?[^\\d]{0,15}(\\d{1,2}(?:[\\.,]\\d{1,4})?))?", min: 5.0, max: 25.0, isInverse: false, flag: "ae" },
    { id: "USD_TR", name: "حوالات تركيا", regex: "(?:تركيا|تركي|حوالة تركيا|حوالات تركيا|🇹🇷)[^\\d]{0,40}(\\d{1,2}(?:[\\.,]\\d{1,4})?)(?:\\s+(?:بيع|شراء)?[^\\d]{0,15}(\\d{1,2}(?:[\\.,]\\d{1,4})?))?", min: 5.0, max: 25.0, isInverse: false, flag: "tr" },
    { id: "USD_CN", name: "حوالات الصين", regex: "(?:الصين|صينية|حوالة الصين|حوالات الصين|🇨🇳)[^\\d]{0,40}(\\d{1,2}(?:[\\.,]\\d{1,4})?)(?:\\s+(?:بيع|شراء)?[^\\d]{0,15}(\\d{1,2}(?:[\\.,]\\d{1,4})?))?", min: 5.0, max: 25.0, isInverse: false, flag: "cn" },
    { id: "CNY", name: "يوان صيني", regex: "(?:CNY|cny|يوان|🇨🇳)[^\\d]{0,40}(\\d{1,2}(?:[\\.,]\\d{1,4})?)(?:\\s+(?:بيع|شراء)?[^\\d]{0,15}(\\d{1,2}(?:[\\.,]\\d{1,4})?))?", min: 0.5, max: 5.0, isInverse: false, flag: "cn" },
    { id: "GOLD_EXT_18", name: "ذهب خارجي 18", regex: "(?:ذهب خارجي 18|خارجي 18|عيار 18 خارجي|18 خارجي)[^\\d]{0,40}(\\d{2,4}(?:[\\.,]\\d+)?)(?:\\s+(?:بيع|شراء)?[^\\d]{0,15}(\\d{2,4}(?:[\\.,]\\d+)?))?", min: 100, max: 5000, isInverse: false, flag: "ly" },
    { id: "GOLD_EXT_21", name: "ذهب خارجي 21", regex: "(?:ذهب خارجي 21|خارجي 21|عيار 21 خارجي|21 خارجي)[^\\d]{0,40}(\\d{2,4}(?:[\\.,]\\d+)?)(?:\\s+(?:بيع|شراء)?[^\\d]{0,15}(\\d{2,4}(?:[\\.,]\\d+)?))?", min: 100, max: 5000, isInverse: false, flag: "ly" },
    { id: "GOLD_SCRAP_18", name: "ذهب كسر 18", regex: "(?:ذهب كسر 18|كسر 18|عيار 18 كسر|18 كسر)[^\\d]{0,40}(\\d{2,4}(?:[\\.,]\\d+)?)(?:\\s+(?:بيع|شراء)?[^\\d]{0,15}(\\d{2,4}(?:[\\.,]\\d+)?))?", min: 100, max: 5000, isInverse: false, flag: "ly" },
    { id: "GOLD_SCRAP_21", name: "ذهب كسر 21", regex: "(?:ذهب كسر 21|كسر 21|عيار 21 كسر|21 كسر)[^\\d]{0,40}(\\d{2,4}(?:[\\.,]\\d+)?)(?:\\s+(?:بيع|شراء)?[^\\d]{0,15}(\\d{2,4}(?:[\\.,]\\d+)?))?", min: 100, max: 5000, isInverse: false, flag: "ly" },
    { id: "GOLD_CAST_18", name: "ذهب مسبوك 18", regex: "(?:ذهب مسبوك 18|مسبوك 18|عيار 18 مسبوك|18 مسبوك)[^\\d]{0,40}(\\d{2,4}(?:[\\.,]\\d+)?)(?:\\s+(?:بيع|شراء)?[^\\d]{0,15}(\\d{2,4}(?:[\\.,]\\d+)?))?", min: 100, max: 5000, isInverse: false, flag: "ly" },
    { id: "GOLD_CAST_24", name: "ذهب مسبوك 24", regex: "(?:ذهب مسبوك 24|مسبوك 24|عيار 24 مسبوك|24 مسبوك)[^\\d]{0,40}(\\d{2,4}(?:[\\.,]\\d+)?)(?:\\s+(?:بيع|شراء)?[^\\d]{0,15}(\\d{2,4}(?:[\\.,]\\d+)?))?", min: 100, max: 5000, isInverse: false, flag: "ly" },
    { id: "GOLD_LIRA_8G", name: "ليرة ذهب 8 جرام", regex: "(?:ليرة ذهب 8 جرام|ليرة ذهب|ليرة 8 جرام|ليرة 8ج)[^\\d]{0,40}(\\d{2,5}(?:[\\.,]\\d+)?)(?:\\s+(?:بيع|شراء)?[^\\d]{0,15}(\\d{2,5}(?:[\\.,]\\d+)?))?", min: 1000, max: 20000, isInverse: false, flag: "ly" },
    { id: "GOLD_MUJARA_14G", name: "مجارة ذهب 14 جرام", regex: "(?:مجارة ذهب 14 جرام|مجارة 14 جرام|مجارة 14)[^\\d]{0,40}(\\d{2,5}(?:[\\.,]\\d+)?)(?:\\s+(?:بيع|شراء)?[^\\d]{0,15}(\\d{2,5}(?:[\\.,]\\d+)?))?", min: 1000, max: 35000, isInverse: false, flag: "ly" },
    { id: "GOLD", name: "كسر الذهب", regex: "(?:كسر الذهب|ذهبي|(?<!ليرة\\s*)(?<!مجارة\\s*)(?<!مسبوك\\s*)ذهب(?!\\s*كسر)(?!\\s*مسبوك)(?!\\s*خارجي)|💎)[^\\d]{0,40}(\\d{2,4}(?:[\\.,]\\d+)?)(?:\\s+(?:بيع|شراء)?[^\\d]{0,15}(\\d{2,4}(?:[\\.,]\\d+)?))?", min: 100, max: 5000, isInverse: false, flag: "ly" },
    { id: "SILVER_CAST_1000", name: "مسبوك فضة عيار 1000", regex: "(?:مسبوك فضة عيار 1000|مسبوك فضة 1000|فضة 1000)[^\\d]{0,40}(\\d{1,3}(?:[\\.,]\\d+)?)(?:\\s+(?:بيع|شراء)?[^\\d]{0,15}(\\d{1,3}(?:[\\.,]\\d+)?))?", min: 1, max: 500, isInverse: false, flag: "ly" },
    { id: "SILVER_SCRAP", name: "كسر فضة", regex: "(?:كسر فضة|كسر الفضة|فضة كسر)[^\\d]{0,40}(\\d{1,3}(?:[\\.,]\\d+)?)(?:\\s+(?:بيع|شراء)?[^\\d]{0,15}(\\d{1,3}(?:[\\.,]\\d+)?))?", min: 1, max: 500, isInverse: false, flag: "ly" },
  ]
};

const text = `
	USD	دولار  	10.3600	10.3575	down		2026-03-18 18:26:00	
4	EUR	يورو	11.7500	11.7475	fixed		2026-03-18 18:24:00	
5	GBP	جنيه استرليني	13.5500	13.5400	fixed		2026-03-18 18:24:00	
6	TND	دينار تونسي	3.2200	3.2100	down		2026-03-18 15:50:00	
7	EGP	جنيه مصري	0.2000	0.1900	fixed		2026-03-18 15:51:00	
8	TRY	ليرة تركية	0.2300	0.2100	down		2026-03-18 15:51:00	
9	JOD	دينار أردني	14.6000	14.5500	down		2026-03-18 15:50:00	
10	jbank	دولار صكوك الجمهورية	11.2400	11.2375	up		2026-03-18 18:27:00	
11	bcd	دولار صكوك التجارة والتنمية	11.2500	11.2475	up		2026-03-18 18:28:00	
12	NCB	دولار صكوك التجاري الوطني	11.2400	11.2375	up		2026-03-18 18:28:00	
13	AB	دولار صكوك الامان	11.2400	11.2375	up		2026-03-18 18:28:00	
14	WB	دولار صكوك الوحدة	11.2500	11.2475	up		2026-03-18 18:28:00	
15	دينار	حوالة دبي	10.2550	10.2525	down		2026-03-18 18:26:00	
16	دينار	حوالة تركيا	10.3000	10.2975	down		2026-03-18 18:26:00	
17	دينار	حوالة الصين	10.3150	10.3125	down		2026-03-18 18:27:00
ذهب كسر 18 1160.000 down 2026-03-18 15:48:00
6 ذهب كسر 21 1353.000 down 2026-03-18 15:48:00
7 ذهب مسبوك 18 1182.000 down 2026-03-18 15:47:00
8 ذهب مسبوك 24 1576.000 down 2026-03-18 15:48:00
9 ليرة ذهب 8 جرام 11520.000 down 2026-03-18 15:48:00
10 مجارة ذهب 14 جرام 23000.000 down 2026-03-18 15:49:00
11 مسبوك فضة عيار 1000 23.500 down 2026-03-18 15:49:00
`;

function isProbablyDateOrTime(text: string, matchIndex: number, matchValue: string): boolean {
  const contextBefore = text.substring(Math.max(0, matchIndex - 10), matchIndex);
  const contextAfter = text.substring(matchIndex + matchValue.length, Math.min(text.length, matchIndex + matchValue.length + 10));
  
  if (/^20\d{2}$/.test(matchValue)) return true;
  if (matchValue.includes('.') || matchValue.includes(',') || matchValue.length > 4) return false;
  if (/[/-]\d{1,2}$/.test(contextBefore) || /[/-]$/.test(contextBefore)) return true;
  if (/^\d{1,2}[/-]/.test(contextAfter) || /^[/-]/.test(contextAfter)) return true;
  if (/^:\d{2}/.test(contextAfter)) return true;
  if (/\d{2}:$/.test(contextBefore) || /:$/.test(contextBefore)) return true;
  if (/بتاريخ|يوم|سنة|عام|الساعة|ساعة/i.test(contextBefore)) return true;
  return false;
}

const extractedRates: Record<string, number> = {};
const lines = text.split('\n');

for (const line of lines) {
  const cleanText = line.trim().replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ');
  if (!cleanText) continue;

  for (const term of appConfig.terms) {
    const regex = new RegExp(term.regex, 'i');
    const match = cleanText.match(regex);
    if (!match) continue;

    let valStr = null;
    const firstCapturedNum = match[1] || match[3];
    const secondCapturedNum = match[2] || match[4];
    
    console.log(`Matched ${term.id}: first=${firstCapturedNum}, second=${secondCapturedNum}`);
    
    if (firstCapturedNum) {
      if (secondCapturedNum) {
        const secondIndex = match.index! + match[0].indexOf(secondCapturedNum);
        if (isProbablyDateOrTime(cleanText, secondIndex, secondCapturedNum)) {
          valStr = firstCapturedNum;
        } else {
          valStr = secondCapturedNum;
        }
      } else {
         valStr = firstCapturedNum;
      }
    }
    
    if (valStr) {
      let cleanValStr = valStr.replace(/,/g, ''); 
      let val = parseFloat(cleanValStr);
      
      if (term.id === 'GOLD_LIRA' && val < 500) continue;
      if (term.id === 'TND' && val < 1.0 && val > 0) val = 1 / val;
      if (term.id === 'EGP' && val > 10.0) val = 1 / val;
      if (term.id === 'TRY' && val > 10.0) val = 1 / val;
      if (term.isInverse && val > 0) val = 1 / val;
      
      if (!isNaN(val) && val >= term.min && val <= term.max) {
        extractedRates[term.id] = val;
      }
    }
  }
}

console.log(extractedRates);
