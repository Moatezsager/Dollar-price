const text = "💰دينار.ليبي=5.50 جنيه.مصري";
const regexStrFixed = "(?:EGP|egp|مصري|مصر(?![ا-ي])|🇪🇬)(?:(?!(?:يورو|دولار|باوند|دينار|ليرة|ذهب|فضة|كسر|مسبوك|أونصة|EUR|USD|GBP|TND|TRY|عالمي|عالميا|جرام|غرام))[^\\d]){0,40}?(?:100|1)?\\s*(?:=|ب|\\-)?\\s*(?<!\\d)((?!(?:100|1)\\s*(?:=|ب|دينار|ليبي|\\-))\\d{1,3}(?:[\\.,]\\d{1,4})?)(?:\\s+(?:بيع|شراء)?[^\\d]{0,30}(?<!\\d)((?!(?:100|1)\\s*(?:=|ب|دينار|ليبي|\\-))\\d{1,3}(?:[\\.,]\\d{1,4})?))?";
const regex = new RegExp(regexStrFixed, 'i');
const match = text.match(regex);
console.log("Match forwards:", match ? match.slice(1) : null);

// What if we add a backwards check for EGP?
// Or we just allow the AI to extract it properly? Wait, let's see what the AI did.
