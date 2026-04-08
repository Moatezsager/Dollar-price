const { TelegramClient } = require("telegram");
const { StringSession } = require("telegram/sessions");
const input = require("input");

(async () => {
  // بياناتك التي زودتني بها
  const apiId = 37876956; 
  const apiHash = "0e9d1601dd10c87ca3b3b6886cb53cb2"; 

  const stringSession = new StringSession(""); 

  const client = new TelegramClient(stringSession, apiId, apiHash, {
    connectionRetries: 5,
  });

  console.log("--- جاري بدء عملية استخراج كود الجلسة ---");
  
  try {
    await client.start({
      phoneNumber: async () => await input.text("أدخل رقم هاتفك (مثال: +218910000000): "),
      password: async () => await input.text("أدخل كلمة مرور التحقق بخطوتين (إن وجدت، وإلا اضغط Enter): "),
      phoneCode: async () => await input.text("أدخل الكود الذي وصلك في تطبيق تيليجرام: "),
      onError: (err) => console.error("خطأ:", err.message),
    });

    console.log("\n✅ تم تسجيل الدخول بنجاح!");
    console.log("--------------------------------------------------");
    console.log("انسخ الكود التالي بالكامل وضعه في TELEGRAM_SESSION:");
    console.log("--------------------------------------------------");
    console.log(client.session.save());
    console.log("--------------------------------------------------");
    
  } catch (err) {
    console.error("فشلت العملية:", err.message);
  } finally {
    process.exit(0);
  }
})();
