import { GoogleGenAI, Type } from "@google/genai";
import "dotenv/config";
import fs from "fs";

const text = `
🟢(اليوم الأثنين)2026/08/17{اخر تحديث}
⏰12:00

💵الدولار=9.11دينار🔺🔥
💰دينار.ليبي=0.33 دينار.تونسي
💰دينار.ليبي=5.50 جنيه.مصري
🪙أونصة الفضة عالمياً= 65.59$
`;

function stripArabicDiacritics(text: string): string {
  let result = text.replace(/[\u064B-\u065F\u0670]/g, '');
  result = result.replace(/\u0640/g, '');
  return result;
}

let code = fs.readFileSync('server.ts', 'utf8');
const termsMatch = code.match(/terms:\s*\[([\s\S]*?)\]/);
const termsStr = "[" + termsMatch[1] + "]";
// Using a basic eval or just a regex test
// Let's print the EGP regex
const egpRegexMatch = termsStr.match(/id:\s*"EGP".*?regex:\s*"(.*?)"/);
console.log("EGP Regex:", egpRegexMatch ? egpRegexMatch[1] : "Not found");

const cleanText = stripArabicDiacritics(text);
const regex = new RegExp(egpRegexMatch[1], 'i');
const match = cleanText.match(regex);
console.log("Regex match for EGP:", match ? match.slice(1).filter(Boolean) : "No match");

// Also let's run the AI prompt
const apiKey = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({ apiKey });
async function testAI() {
  const prompt = `أنت خبير مالي في ليبيا. استخرج أسعار العملات والذهب من النص التالي، والذي تم نشره في قناة "test".
النص:
${text}

المطلوب:
إرجاع مصفوفة JSON تحتوي على كائنات بصيغة:
[
  { "code": "USD", "value": 9.10 }
]

تعليمات هامة جداً:
1. استخرج السعر النهائي للوحدة الأجنبية الواحدة مقابل الدينار الليبي.
2. رموز العملات المسموحة فقط: USD, EUR, GBP, USD_JBANK, USD_NCB, USD_CHECKS, TND, EGP, TRY
3. لا تقم بإضافة أي عملات غير موجودة. إذا لم يكن هناك أسعار، أرجع مصفوفة فارغة [].
4. للذهب (كسر أو خارجي) استخرج السعر للجرام الواحد بالدينار.
5. كلمة "صكوك" تعني الدولار بصكوك، استخدم الرمز USD_CHECKS أو USD_JBANK.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });
    console.log("AI Result:", response.text);
  } catch(e) {
    console.error("AI error", e);
  }
}
testAI();
