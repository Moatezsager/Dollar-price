import { GoogleGenAI } from "@google/genai";
import "dotenv/config";

const apiKey = process.env.GEMINI_API_KEY || "AIzaSyC-qVnUYQ8NUu2AQx_Ub3LBbL5w6-Op31U";
const ai = new GoogleGenAI({ apiKey });

async function extractRatesWithAI(text: string) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `You are a High-Intelligence Financial Analyst specialized in the Libyan Foreign Exchange Market. 
      Your goal is to perform a deep semantic analysis of Telegram messages to extract currency rates with 100% accuracy.

      CORE INTELLIGENCE REQUIREMENTS:
      1. DEEP SEMANTIC UNDERSTANDING: Understand the full context. Even if grammar is broken or text is fragmented, reconstruct the intended meaning.
      2. OFFICIAL VS PARALLEL DISTINCTION:
         - OFFICIAL (الرسمي): Keywords: مصرف ليبيا المركزي، رسمي، مركزي، منظومة، سعر المصرف. 
         - If the message is from the Central Bank or mentions "Official Rates", map the USD rate to "OFFICIAL_USD".
         - In official tables, the first numerical value after the currency name is the BUY rate (سعر الشراء). Use this value.
         - Example Official: "8  الدولار الأمريكي  6.4324  6.4003" -> OFFICIAL_USD is 6.4324.
         - PARALLEL (الموازي): Default market. Keywords: كاش، في اليد، السوق، خضراء، سوق موازي.
         - In parallel market tables (like the one below), the first numerical value after the currency name is the SELL rate (سعر البيع). Use this value.
         - Example Parallel: "USD دولار مدينة مصراته 10.7900 10.7875" -> USD is 10.7900.
         - Example Parallel: "jbank دولار صكوك الجمهورية 11.6000 11.5975" -> USD_JBANK is 11.6000.
      3. LINGUISTIC FLEXIBILITY: Understand Libyan dialect and shorthand. Typos are signals to be interpreted.
      4. NUMERICAL PRECISION: Extract numbers regardless of format (Arabic ٠-٩ or Western 0-9).

      MESSAGE TO ANALYZE:
      "${text}"

      MAPPING LOGIC:
      - If message is OFFICIAL/BANK (مصرف ليبيا المركزي):
        - "الدولار الأمريكي" -> OFFICIAL_USD
        - "اليورو" -> OFFICIAL_EUR
        - "الجنيه الاسترليني" -> OFFICIAL_GBP
        - "الدينار التونسي" -> OFFICIAL_TND
        - "الريال السعودي" -> OFFICIAL_SAR
        - "الدرهم الاماراتي" -> OFFICIAL_AED
        - "الليرة التركية" -> OFFICIAL_TRY
        - "الايوان الصيني" -> OFFICIAL_CNY
      - If message is PARALLEL/MARKET (سوق موازي):
        - "الدولار" / "usd" / "مصراته" / "💵" -> USD
        - "يورو" / "eur" / "💶" -> EUR
        - "استرليني" / "gbp" / "الباوند" / "💷" -> GBP
        - "تونسي" / "tnd" -> TND
        - "مصري" / "egp" -> EGP
        - "ليرة تركية" / "try" -> TRY
        - "أردني" / "jod" -> JOD
        - "صكوك" / "بصك" / "jbank" / "ncb" -> Apply the SAME value to USD_JBANK and USD_NCB unless a specific bank is named.
        - "التجارة والتنمية" / "bcd" -> USD_BCD
        - "الأمان" / "ab" -> USD_AB
        - "الوحدة" / "wb" -> USD_WB
        - "حوالة دبي" / "ae" -> USD_AE
        - "حوالة تركيا" / "tr" -> USD_TR
        - "حوالة الصين" / "cn" -> USD_CN
        - "ذهب كسر" / "كسر الذهب" / "💎" (in context of gold) -> GOLD
      
      BEHAVIOR RULES:
      1. IGNORE DATES/TIMES in the text. Look only for prices.
      2. If a value is listed twice (BUY/SELL), take the SELL (higher if selling, lower if buying - usually the first number in parallel market tables).
      3. For "GOLD", extract the gram price (e.g., 1233).
      4. "صكوك" (Cheques) are often unified. If you see "صكوك = 11.45", then set USD_JBANK=11.45 and USD_NCB=11.45.

      OUTPUT FORMAT:
      Return ONLY a valid JSON object. Use null for missing values.
      {
        "USD": number, "EUR": number, "GBP": number, "TND": number, "EGP": number, "TRY": number,
        "JOD": number, "BHD": number, "KWD": number, "AED": number, "SAR": number, "QAR": number,
        "CNY": number, "GOLD": number, "USD_JBANK": number, "USD_BCD": number, "USD_NCB": number,
        "USD_AB": number, "USD_WB": number, "USD_AE": number, "USD_TR": number, "USD_CN": number,
        "OFFICIAL_USD": number, "OFFICIAL_EUR": number, "OFFICIAL_GBP": number, "OFFICIAL_TND": number,
        "OFFICIAL_SAR": number, "OFFICIAL_AED": number, "OFFICIAL_TRY": number, "OFFICIAL_CNY": number
      }`,
      config: {
        responseMimeType: "application/json",
      }
    });
    
    console.log("Raw response:", response.text);
    const result = JSON.parse(response.text);
    console.log("Parsed:", result);
  } catch (error) {
    console.error("AI Extraction Error:", error);
  }
}

extractRatesWithAI("الدولار اليوم 7.50 واليورو 8.20");
