import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Copy, Check, Code2, Zap, Lock, Database, ArrowRight } from 'lucide-react';

interface ApiDocsProps {
  onBack: () => void;
}

export const ApiDocs: React.FC<ApiDocsProps> = ({ onBack }) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const freeApiCode = `// جلب أسعار الدولار واليورو اللحظية (مجاني)
fetch('https://api.almoasher.ly/v1/rates/free')
  .then(response => response.json())
  .then(data => {
    console.log('سعر الدولار:', data.usd.sell);
    console.log('سعر اليورو:', data.eur.sell);
  })
  .catch(error => console.error('خطأ في الاتصال:', error));`;

  const paidApiCode = `// جلب جميع الأسعار (يتطلب مفتاح API)
const API_KEY = 'YOUR_API_KEY_HERE';

fetch('https://api.almoasher.ly/v1/rates/all', {
  headers: {
    'Authorization': \`Bearer \${API_KEY}\`
  }
})
  .then(response => response.json())
  .then(data => {
    console.log('جميع الأسعار:', data);
  })
  .catch(error => console.error('خطأ في الاتصال:', error));`;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-12"
      dir="rtl"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div>
          <button 
            onClick={onBack}
            className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors mb-4 text-sm font-medium"
          >
            <ArrowRight className="w-4 h-4" />
            العودة للرئيسية
          </button>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight mb-3">
            واجهة برمجة التطبيقات <span className="text-emerald-400">(API)</span>
          </h1>
          <p className="text-zinc-400 text-sm sm:text-base max-w-2xl leading-relaxed">
            نوفر للمطورين وأصحاب الأعمال واجهة برمجية سهلة وسريعة للحصول على أحدث أسعار الصرف في السوق الليبي. اختر الباقة التي تناسب احتياجاتك وابدأ الربط في دقائق.
          </p>
        </div>
        <div className="hidden sm:flex w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 items-center justify-center">
          <Code2 className="w-8 h-8 text-emerald-400" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Free Tier */}
        <div className="relative rounded-3xl bg-[#111] border border-white/5 p-6 sm:p-8 overflow-hidden group hover:border-emerald-500/30 transition-colors">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl -mr-16 -mt-16 transition-opacity group-hover:opacity-100 opacity-50"></div>
          
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <Zap className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">الباقة المجانية</h2>
                <p className="text-xs text-emerald-400 font-medium mt-1">مفتوحة للجميع</p>
              </div>
            </div>
            
            <p className="text-zinc-400 text-sm mb-6 leading-relaxed">
              احصل على أسعار الدولار (USD) واليورو (EUR) اللحظية في السوق الموازي بشكل مجاني تماماً. مثالية للمشاريع الصغيرة والتطبيقات الشخصية.
            </p>

            <ul className="space-y-3 mb-8">
              <li className="flex items-center gap-2 text-sm text-zinc-300">
                <Check className="w-4 h-4 text-emerald-400" />
                سعر الدولار واليورو (بيع وشراء)
              </li>
              <li className="flex items-center gap-2 text-sm text-zinc-300">
                <Check className="w-4 h-4 text-emerald-400" />
                تحديثات لحظية
              </li>
              <li className="flex items-center gap-2 text-sm text-zinc-300">
                <Check className="w-4 h-4 text-emerald-400" />
                لا يتطلب تسجيل دخول
              </li>
            </ul>

            <div className="bg-[#0a0a0a] rounded-xl border border-white/5 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2 border-b border-white/5 bg-white/[0.02]">
                <span className="text-xs font-mono text-zinc-500">JavaScript / Fetch</span>
                <button 
                  onClick={() => handleCopy(freeApiCode, 'free')}
                  className="p-1.5 rounded-md hover:bg-white/5 text-zinc-400 hover:text-white transition-colors"
                  title="نسخ الكود"
                >
                  {copiedId === 'free' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <div className="p-4 overflow-x-auto" dir="ltr">
                <pre className="text-sm font-mono text-zinc-300">
                  <code>{freeApiCode}</code>
                </pre>
              </div>
            </div>
          </div>
        </div>

        {/* Paid Tier */}
        <div className="relative rounded-3xl bg-gradient-to-b from-[#1a1a1a] to-[#111] border border-blue-500/20 p-6 sm:p-8 overflow-hidden group hover:border-blue-500/40 transition-colors shadow-[0_0_30px_rgba(59,130,246,0.05)]">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -mr-16 -mt-16 transition-opacity group-hover:opacity-100 opacity-50"></div>
          
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <Database className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">الباقة الاحترافية</h2>
                <p className="text-xs text-blue-400 font-medium mt-1">للمؤسسات والشركات</p>
              </div>
            </div>
            
            <p className="text-zinc-400 text-sm mb-6 leading-relaxed">
              وصول كامل لجميع بيانات المنصة بما في ذلك أسعار الصكوك، الحوالات، المعادن، والأسعار الرسمية. مصممة لتلبية احتياجات الأعمال المتقدمة.
            </p>

            <ul className="space-y-3 mb-8">
              <li className="flex items-center gap-2 text-sm text-zinc-300">
                <Check className="w-4 h-4 text-blue-400" />
                جميع العملات والصكوك والحوالات
              </li>
              <li className="flex items-center gap-2 text-sm text-zinc-300">
                <Check className="w-4 h-4 text-blue-400" />
                بيانات تاريخية ورسوم بيانية
              </li>
              <li className="flex items-center gap-2 text-sm text-zinc-300">
                <Check className="w-4 h-4 text-blue-400" />
                دعم فني مخصص (SLA)
              </li>
            </ul>

            <div className="bg-[#0a0a0a] rounded-xl border border-white/5 overflow-hidden mb-6">
              <div className="flex items-center justify-between px-4 py-2 border-b border-white/5 bg-white/[0.02]">
                <span className="text-xs font-mono text-zinc-500">JavaScript / Fetch</span>
                <button 
                  onClick={() => handleCopy(paidApiCode, 'paid')}
                  className="p-1.5 rounded-md hover:bg-white/5 text-zinc-400 hover:text-white transition-colors"
                  title="نسخ الكود"
                >
                  {copiedId === 'paid' ? <Check className="w-4 h-4 text-blue-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <div className="p-4 overflow-x-auto" dir="ltr">
                <pre className="text-sm font-mono text-zinc-300">
                  <code>{paidApiCode}</code>
                </pre>
              </div>
            </div>

            <button className="w-full py-3 px-4 bg-blue-500 hover:bg-blue-600 text-white text-sm font-bold rounded-xl transition-colors flex items-center justify-center gap-2">
              <Lock className="w-4 h-4" />
              طلب مفتاح API (تواصل معنا)
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
