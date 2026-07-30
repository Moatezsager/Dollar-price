const fs = require('fs');
let code = fs.readFileSync('src/Admin.tsx', 'utf8');

const targetSelect = `                    <div>
                      <label className="block text-sm font-bold text-zinc-400 mb-2">تنسيق رسالة النشر (قالب النشر تلقائي/تجريبي)</label>
                      <select
                        value={config?.telegramTemplateStyle || 'classic'}
                        onChange={(e) => setConfig({ ...config, telegramTemplateStyle: e.target.value })}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500/50"
                        dir="rtl"
                      >
                        <option value="random" className="bg-zinc-900 text-white text-emerald-400 font-bold">اختيار عشوائي ذكي 🎲 (ينصح به لكسر الروتين)</option>
                        <option value="classic" className="bg-zinc-900 text-white">النمط الكلاسيكي 📊 (تفصيلي بالأسعار السابقة)</option>
                        <option value="modern" className="bg-zinc-900 text-white">النمط الحديث 📈 (مؤشر نسب التغيير)</option>
                        <option value="professional" className="bg-zinc-900 text-white">النمط المهني 💎 (الأكثر احترافية للاقتصاد)</option>
                        <option value="urgent" className="bg-zinc-900 text-white">النمط العاجل 🔴 (للتحديثات السريعة)</option>
                        <option value="compact" className="bg-zinc-900 text-white">النمط المختصر ⚡ (سريع القراءة)</option>
                        <option value="market_alert" className="bg-zinc-900 text-white">نمط جرس السوق 🔔 (مختصر للمتداولين)</option>
                        <option value="elegant" className="bg-zinc-900 text-white">النمط الأنيق ⚜️ (تصميم فاخر للمتابعين)</option>
                      </select>
                    </div>`;

const replaceSelect = `                    <div>
                      <label className="block text-sm font-bold text-zinc-400 mb-2">تنسيق رسالة النشر (قالب النشر تلقائي/تجريبي)</label>
                      <select
                        value="professional"
                        disabled
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-zinc-400 focus:outline-none cursor-not-allowed opacity-80"
                        dir="rtl"
                      >
                        <option value="professional">النمط الموحد الاحترافي 💎 (شامل للأسعار الرسمية والموازية)</option>
                      </select>
                      <p className="text-xs text-zinc-500 mt-2">تم توحيد النمط وتصميمه بأعلى جودة واحترافية ليناسب تحديثات المصرف المركزي والسوق الموازي.</p>
                    </div>`;

code = code.replace(targetSelect, replaceSelect);
fs.writeFileSync('src/Admin.tsx', code);
console.log('patched Admin.tsx UI');
