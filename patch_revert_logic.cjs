const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

const oldLogic = `      // 🧠 نظام الذكاء الاصطناعي لمنع الإزعاج (Smart Anti-Spam)
      // 1. صدمة السوق (أقل من ساعة ونصف): لا ننشر إلا إذا كان التغيير ضخماً (4 قروش للعملات، 1% للذهب)
      // 2. تحديث عادي (بعد ساعة ونصف): ننشر إذا تغير السعر بـ 2 قروش للعملات أو 0.4% للذهب
      // 3. تحديث روتيني (بعد 4 ساعات): ننشر أي تغيير طفيف (قرش واحد) لنُعلم المتابعين بنشاط السوق
      
      let isShock = false;
      let isNormal = false;
      let isRoutine = false;
      
      if (isMetal) {
         isShock = hoursSinceLast < 1.5 && pctChange >= 0.8;
         isNormal = hoursSinceLast >= 1.5 && pctChange >= 0.4;
         isRoutine = hoursSinceLast >= 4.0 && diffFromLastBroadcast > 0;
      } else {
         isShock = hoursSinceLast < 1.5 && diffFromLastBroadcast >= 0.04;
         isNormal = hoursSinceLast >= 1.5 && diffFromLastBroadcast >= 0.02;
         isRoutine = hoursSinceLast >= 4.0 && diffFromLastBroadcast >= 0.01;
      }
      
      if (isShock || isNormal || isRoutine || history.time === 0) {
        // We attach the type of update so we can style the message
        (u as any).updateLevel = isShock ? 'shock' : (isNormal ? 'normal' : 'routine');
        qualifiedUpdates.push(u);
      }`;

const newLogic = `      // قواعد النشر الجديدة المبسطة (حسب طلب المستخدم)
      // 1. تغيير بقرشين (0.02) فأكثر: ينشر فوراً.
      // 2. تغيير بقرش واحد (0.01) فأكثر: ينشر بشرط مرور ساعة كاملة.
      
      let shouldPublish = false;
      
      if (isMetal) {
         if (pctChange >= 0.4) shouldPublish = true; // تغير كبير للذهب
         if (pctChange >= 0.2 && hoursSinceLast >= 1.0) shouldPublish = true; // تغير طفيف بعد مرور ساعة
      } else {
         if (diffFromLastBroadcast >= 0.02) shouldPublish = true; // فرق قرشين ينشر دائما
         if (diffFromLastBroadcast >= 0.01 && hoursSinceLast >= 1.0) shouldPublish = true; // فرق قرش بعد مرور ساعة
      }
      
      if (shouldPublish || history.time === 0) {
        qualifiedUpdates.push(u);
      }`;

content = content.replace(oldLogic, newLogic);

const oldTextLogic = `  const hasShock = updates.some((u: any) => u.updateLevel === 'shock');
  const isRoutineOnly = updates.every((u: any) => u.updateLevel === 'routine');
  
  let header = '📊 *مؤشر الدينار | تحديث السوق الموازي*';
  if (hasShock) {
    header = '🚨 *مؤشر الدينار | تغيير ملحوظ في السوق*';
  } else if (isRoutineOnly) {
    header = '📌 *مؤشر الدينار | ملخص نشاط السوق*';
  }
  
  let message = \`\${header}\\n\`;`;

const newTextLogic = `  let message = \`📊 *مؤشر الدينار | تحديث السوق الموازي*\\n\`;`;

content = content.replace(oldTextLogic, newTextLogic);

fs.writeFileSync('server.ts', content);
console.log('Successfully applied simplified logic!');
