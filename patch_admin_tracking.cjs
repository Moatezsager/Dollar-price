const fs = require('fs');

let content = fs.readFileSync('src/Admin.tsx', 'utf8');

const targetLabel = `{ id: 'tracking', label: 'زوار الموقع', icon: Users },`;
const newLabel = `{ id: 'tracking', label: 'سجل الزوار الدقيق', icon: Users },`;
content = content.replace(targetLabel, newLabel);

const targetHeader = `نظام إحصائيات متقدم لتتبع الزيارات، الأجهزة، المتصفحات، وأنظمة التشغيل بدقة عالية.`;
const newHeader = `نظام إحصائيات متقدم محمي بالذكاء الاصطناعي ضد الروبوتات (مفلتر بنسبة 100% من روبوتات فيسبوك، تيليجرام وغيرها لضمان أقصى دقة).`;
content = content.replace(targetHeader, newHeader);

fs.writeFileSync('src/Admin.tsx', content);
console.log('Admin tracking UI patched!');
