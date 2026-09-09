const fs = require('fs');
const content = fs.readFileSync('server.ts', 'utf8');

const oldLogic = `      // The user requested >= 2 piasters (0.02)
      const hasSignificantPriceChange = isMetal ? (pctChange >= 0.4) : (diffFromLastBroadcast >= 0.02);
      
      // If 3 hours have passed since we last talked about this currency AND there's ANY change
      const hasTimePassed = hoursSinceLast >= 3 && diffFromLastBroadcast > 0;
      
      if (hasSignificantPriceChange || hasTimePassed || history.time === 0) {
        qualifiedUpdates.push(u);
      }`;

const newLogic = `      // 🧠 نظام الذكاء الاصطناعي لمنع الإزعاج (Smart Anti-Spam)
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

if (content.includes(oldLogic)) {
  const newContent = content.replace(oldLogic, newLogic);
  fs.writeFileSync('server.ts', newContent);
  console.log('Successfully patched broadcast cooldown logic!');
} else {
  console.error('Could not find old logic in server.ts');
}
