const fs = require('fs');
let code = fs.readFileSync('src/components/PushNotificationPrompt.tsx', 'utf8');

code = code.replace(
  `        <div className="bg-[#1a1a1a]/90 backdrop-blur-xl border border-white/10 p-4 rounded-2xl shadow-2xl flex flex-col gap-4">`,
  `        <div className="bg-gradient-to-b from-[#1a1a1a]/95 to-[#0a0a0a]/95 backdrop-blur-2xl border border-white/10 p-5 rounded-3xl shadow-[0_20px_40px_-10px_rgba(0,0,0,0.5)] flex flex-col gap-5 overflow-hidden relative">
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent"></div>
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>`
);

code = code.replace(
  `              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center flex-shrink-0 shadow-[0_0_20px_rgba(59,130,246,0.3)] border border-blue-400/20">`,
  `              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center flex-shrink-0 shadow-[0_0_30px_rgba(37,99,235,0.4)] border border-blue-400/30 relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20"></div>`
);

code = code.replace(
  `                <h3 className="text-white font-bold text-sm sm:text-base">تفعيل التنبيهات</h3>`,
  `                <h3 className="text-white font-black text-base sm:text-lg tracking-wide">تفعيل التنبيهات</h3>`
);

code = code.replace(
  `              <button 
                onClick={handleSubscribe}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-sm rounded-xl transition-all shadow-lg shadow-blue-500/20 whitespace-nowrap"
              >`,
  `              <button 
                onClick={handleSubscribe}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 active:scale-95 text-white font-bold text-sm rounded-xl transition-all shadow-[0_0_20px_rgba(37,99,235,0.4)] whitespace-nowrap border border-blue-400/30"
              >`
);

fs.writeFileSync('src/components/PushNotificationPrompt.tsx', code);
console.log('patched PushNotificationPrompt UI');
