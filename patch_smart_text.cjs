const fs = require('fs');
const content = fs.readFileSync('server.ts', 'utf8');

const oldText = `  let message = \`📊 *مؤشر الدينار | تحديث السوق الموازي*\\n\`;`;
const newText = `  const hasShock = updates.some((u: any) => u.updateLevel === 'shock');
  const isRoutineOnly = updates.every((u: any) => u.updateLevel === 'routine');
  
  let header = '📊 *مؤشر الدينار | تحديث السوق الموازي*';
  if (hasShock) {
    header = '🚨 *مؤشر الدينار | تغيير ملحوظ في السوق*';
  } else if (isRoutineOnly) {
    header = '📌 *مؤشر الدينار | ملخص نشاط السوق*';
  }
  
  let message = \`\${header}\\n\`;`;

if (content.includes(oldText)) {
  const newContent = content.replace(oldText, newText);
  fs.writeFileSync('server.ts', newContent);
  console.log('Successfully patched broadcast text formatting!');
} else {
  console.error('Could not find old text in server.ts');
}
