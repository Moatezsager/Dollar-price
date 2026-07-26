const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

content = content.replace(
  'message += `🔗 التحديث المباشر: https://tinyurl.com/2j7667u2\\n`;\n    message += `📱 المصدر: شبكة مراسلي مؤشر الدينار`;',
  'message += `🔗 التحديث المباشر والرسوم البيانية:\\n🌐 https://tinyurl.com/2j7667u2\\n\\n`;\n    message += `📱 المصدر: شبكة مراسلي مؤشر الدينار | الدقة والسرعة`;'
);

content = content.replace(
  'message += `🔗 https://tinyurl.com/2j7667u2`;',
  'message += `🌐 لمتابعة الأسعار لحظة بلحظة:\\n🔗 https://tinyurl.com/2j7667u2`;'
);

content = content.replace(
  'message += `🌐 التفاصيل: https://tinyurl.com/2j7667u2`;',
  'message += `🌐 التفاصيل الحية والرسوم البيانية:\\n🔗 https://tinyurl.com/2j7667u2`;'
);

content = content.replace(
  'message += `📌 https://tinyurl.com/2j7667u2`;',
  'message += `📌 منصة مؤشر الدينار:\\n🌐 https://tinyurl.com/2j7667u2`;'
);

fs.writeFileSync('server.ts', content);
