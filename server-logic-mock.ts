
export const appConfig = {
  terms: [
    { id: "USD", name: "دولار أمريكي", regex: "(?:الدولار|دولار|الخضراء|خضراء|كاش|💵|🇺🇸)(?!\\s*صكوك|\\s*بصك|\\s*شيك)[^\\d]{0,15}(\\d{1,2}(?:[\\.,]\\d{1,4})?)(?:\\s+(?:بيع|شراء)?[^\\d]{0,5}(\\d{1,2}(?:[\\.,]\\d{1,4})?))?", min: 5.0, max: 25.0, isInverse: false, flag: "us" },
    { id: "EUR", name: "يورو", regex: "(?:يورو|اليورو|💶|eur|🇪🇺)[^\\d]{0,25}(\\d{1,2}(?:[\\.,]\\d{1,4})?)(?:\\s+(?:بيع|شراء)?[^\\d]{0,5}(\\d{1,2}(?:[\\.,]\\d{1,4})?))?", min: 5.0, max: 25.0, isInverse: false, flag: "eu" },
    { id: "USD_JBANK", name: "صكوك الجمهورية", regex: "(?:jbank|الجمهورية|صكوك|بصك)[^\\d]{0,25}(\\d{1,2}(?:[\\.,]\\d{1,4})?)(?:\\s+(?:بيع|شراء)?[^\\d]{0,5}(\\d{1,2}(?:[\\.,]\\d{1,4})?))?", min: 5.0, max: 25.0, isInverse: false, flag: "us" },
    { id: "GOLD_SCRAP_18", name: "ذهب كسر 18", regex: "(?:ذهب كسر 18|كسر 18|عيار 18 كسر|18 كسر)[^\\d]{0,25}(\\d{2,4}(?:[\\.,]\\d+)?)(?:\\s+(?:بيع|شراء)?[^\\d]{0,5}(\\d{2,4}(?:[\\.,]\\d+)?))?", min: 100, max: 5000, isInverse: false, flag: "ly" },
    { id: "USD_AE", name: "حوالات دبي", regex: "(?:دبي|امارات|الإمارات|🇦🇪)[^\\d]{0,25}(\\d{1,2}(?:[\\.,]\\d{1,4})?)(?:\\s+(?:بيع|شراء)?[^\\d]{0,5}(\\d{1,2}(?:[\\.,]\\d{1,4})?))?", min: 5.0, max: 25.0, isInverse: false, flag: "ae" },
    { id: "USD_TR", name: "حوالات تركيا", regex: "(?:تركيا|تركي|🇹🇷)[^\\d]{0,25}(\\d{1,2}(?:[\\.,]\\d{1,4})?)(?:\\s+(?:بيع|شراء)?[^\\d]{0,5}(\\d{1,2}(?:[\\.,]\\d{1,4})?))?", min: 5.0, max: 25.0, isInverse: false, flag: "tr" },
  ]
};

export function isProbablyDate(text: string, matchIndex: number, matchValue: string): boolean {
  const contextBefore = text.substring(Math.max(0, matchIndex - 10), matchIndex);
  const contextAfter = text.substring(matchIndex + matchValue.length, Math.min(text.length, matchIndex + matchValue.length + 10));
  if (/^20\d{2}$/.test(matchValue)) return true;
  if (/[/-]\d{1,2}$/.test(contextBefore)) return true;
  if (/^\d{1,2}[/-]/.test(contextAfter)) return true;
  if (/بتاريخ|يوم|سنة|عام/i.test(contextBefore)) return true;
  return false;
}
