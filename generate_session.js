import { TelegramClient, sessions } from "telegram";
const { StringSession } = sessions;
import input from "input";
import dotenv from "dotenv";

// تحميل المتغيرات من ملف .env إذا كان موجوداً
dotenv.config();

(async () => {
  // القيم التي زودتني بها
  const apiId = 37876956; 
  const apiHash = "0e9d1601dd10c87ca3b3b6886cb53cb2"; 

  console.log("\n==================================================");
  console.log("   🚀 سكربت استخراج كود جلسة تيليجرام (Session)   ");
  console.log("==================================================\n");

  const stringSession = new StringSession(""); 

  const client = new TelegramClient(stringSession, apiId, apiHash, {
    connectionRetries: 5,
    deviceModel: "PriceScraperAuth",
  });

  try {
    await client.start({
      phoneNumber: async () => await input.text("📞 أدخل رقم هاتفك مع مفتاح الدولة (مثال: +218910000000): "),
      password: async () => await input.text("🔐 أدخل كلمة مرور التحقق بخطوتين (اضغط Enter إذا لم تكن مفعلة): "),
      phoneCode: async () => await input.text("🔢 أدخل الكود الذي وصلك في تطبيق تيليجرام: "),
      onError: (err) => console.error("\n❌ خطأ:", err.message),
    });

    const sessionString = client.session.save();

    console.log("\n✅ تم تسجيل الدخول بنجاح!");
    console.log("\n--------------------------------------------------");
    console.log("كود الجلسة الخاص بك (انسخه بالكامل):");
    console.log("--------------------------------------------------\n");
    console.log(sessionString);
    console.log("\n--------------------------------------------------");
    console.log("قم بنسخ هذا الكود ووضعه في متغير TG_SESSION_V2 في Render.");
    console.log("--------------------------------------------------\n");
    
  } catch (err) {
    console.error("\n❌ فشلت العملية:", err.message);
  } finally {
    await client.disconnect();
    process.exit(0);
  }
})();
