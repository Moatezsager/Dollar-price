const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

// Replace standard links
content = content.replace(
  /🔗 التحديث المباشر: https:\/\/tinyurl.com\/2j7667u2\\n`;\n\s*message \+= `📱 المصدر: شبكة مراسلي مؤشر الدينار`;/g,
  `🔗 التحديث المباشر والرسوم البيانية:\\n🌐 https://tinyurl.com/2j7667u2\\n\\n`;\n    message += \`📱 المصدر: شبكة مراسلي مؤشر الدينار | الدقة والسرعة\`;`
);

content = content.replace(
  /🔗 https:\/\/tinyurl.com\/2j7667u2`;/g,
  `🌐 لمتابعة الأسعار لحظة بلحظة:\\n🔗 https://tinyurl.com/2j7667u2\`;`
);

content = content.replace(
  /🌐 التفاصيل: https:\/\/tinyurl.com\/2j7667u2`;/g,
  `🌐 التفاصيل الحية والرسوم البيانية:\\n🔗 https://tinyurl.com/2j7667u2\`;`
);

content = content.replace(
  /📌 https:\/\/tinyurl.com\/2j7667u2`;/g,
  `📌 منصة مؤشر الدينار:\\n🌐 https://tinyurl.com/2j7667u2\`;`
);

fs.writeFileSync('server.ts', content);
