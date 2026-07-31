const fs = require('fs');
let code = fs.readFileSync('src/components/PushNotificationPrompt.tsx', 'utf8');

code = code.replace(/pushPromptDismissed/g, 'pushPromptDismissed_v2');

code = code.replace(
  `                <p className="text-zinc-400 text-xs sm:text-sm">تابع تغييرات الأسعار لحظة بلحظة</p>`,
  `                <p className="text-zinc-400 text-xs sm:text-sm">تنبيه عند تغير الأسعار أو عدم الدخول لأيام</p>`
);

code = code.replace(
  `// Wait for a few seconds before prompting\n      await new Promise(resolve => setTimeout(resolve, 5000));`,
  `// Wait for a few seconds before prompting\n      await new Promise(resolve => setTimeout(resolve, 3000));`
);

fs.writeFileSync('src/components/PushNotificationPrompt.tsx', code);
console.log('patched PushNotificationPrompt');
