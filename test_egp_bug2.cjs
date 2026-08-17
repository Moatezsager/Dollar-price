const fs = require('fs');

let code = fs.readFileSync('server.ts', 'utf8');
const termsMatch = code.match(/terms:\s*\[([\s\S]*?)\]/);
const termsStr = "[" + termsMatch[1] + "]";
const terms = eval(termsStr);
const egpTerm = terms.find(t => t.id === 'EGP');
console.log("EGP Regex:", egpTerm.regex);

const text = `
🟢(اليوم الأثنين)2026/08/17{اخر تحديث}
⏰12:00

💵الدولار=9.11دينار🔺🔥
💰دينار.ليبي=0.33 دينار.تونسي
💰دينار.ليبي=5.50 جنيه.مصري
🪙أونصة الفضة عالمياً= 65.59$
`;

function stripArabicDiacritics(text) {
  let result = text.replace(/[\u064B-\u065F\u0670]/g, '');
  result = result.replace(/\u0640/g, '');
  return result;
}

const cleanText = stripArabicDiacritics(text);
const regex = new RegExp(egpTerm.regex, 'i');
const match = cleanText.match(regex);
console.log("Regex match for EGP:", match ? match.slice(1).filter(Boolean) : "No match");
