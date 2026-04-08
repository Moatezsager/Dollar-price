import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Zap, Brain, MessageSquare, RefreshCw, Send, CheckCircle2, AlertCircle, TrendingUp, ChevronLeft } from 'lucide-react';

interface AITabProps {
  onExtract: (text: string) => Promise<any>;
  onSave: (rates: any) => Promise<boolean>;
  loading: boolean;
  currentRates: any;
}

export const AITab: React.FC<AITabProps> = ({ onExtract, onSave, loading, currentRates }) => {
  const [text, setText] = useState("");
  const [extracted, setExtracted] = useState<any>(null);

  const handleExtract = async () => {
    const data = await onExtract(text);
    if (data?.success) {
      setExtracted(data.extractedRates);
    }
  };

  const handleSave = async () => {
    const success = await onSave(extracted);
    if (success) {
      setExtracted(null);
      setText("");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-5xl mx-auto space-y-8 pb-24"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 rounded-[2rem] bg-amber-500/10 flex items-center justify-center">
            <Zap className="w-8 h-8 text-amber-500" />
          </div>
          <div>
            <h2 className="text-3xl font-black text-white uppercase tracking-tight">قارئ النصوص الذكي</h2>
            <p className="text-zinc-500 text-sm font-medium mt-1">استخراج الأسعار من الرسائل النصية باستخدام الذكاء الاصطناعي</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
           <div className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] p-8">
              <div className="flex items-center gap-3 mb-6">
                 <MessageSquare className="w-5 h-5 text-zinc-500" />
                 <h3 className="font-bold">أدخل نص الرسالة</h3>
              </div>
              <textarea 
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="الصق نص الرسالة من تليجرام هنا... (مثال: الدولار بيع 7.20 شراء 7.15)"
                className="w-full h-64 bg-black/40 border border-white/10 rounded-2xl p-6 text-white text-sm outline-none focus:border-amber-500/50 transition-all resize-none leading-relaxed"
              />
              <button 
                onClick={handleExtract}
                disabled={loading || !text.trim()}
                className="w-full mt-6 py-4 bg-amber-500 hover:bg-amber-400 disabled:bg-zinc-800 text-black font-black rounded-2xl transition-all shadow-xl shadow-amber-500/20 flex items-center justify-center gap-3"
              >
                {loading ? <RefreshCw className="w-6 h-6 animate-spin" /> : (
                  <>
                    <span>تحليل واستخراج الأسعار</span>
                    <Brain className="w-5 h-5" />
                  </>
                )}
              </button>
           </div>
        </div>

        <div className="space-y-6">
           {extracted ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white/[0.02] border border-emerald-500/20 rounded-[2.5rem] p-8 relative overflow-hidden"
              >
                 <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-3xl -mr-16 -mt-16"></div>
                 <div className="flex items-center justify-between mb-8">
                    <h3 className="text-xl font-black text-white flex items-center gap-3">
                       <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                       النتائج المستخرجة
                    </h3>
                    <button onClick={() => setExtracted(null)} className="text-xs text-zinc-500 hover:text-white uppercase font-black">إعادة</button>
                 </div>

                 <div className="space-y-3 mb-8">
                    {Object.entries(extracted).map(([code, value]: [string, any]) => {
                       const current = currentRates[code] || 0;
                       const diff = value - current;
                       return (
                          <div key={code} className="flex items-center justify-between p-4 rounded-xl bg-black/40 border border-white/5">
                             <div className="flex items-center gap-4">
                                <span className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-xs font-black font-mono">{code}</span>
                                <div className="text-lg font-black text-white font-mono">{value.toFixed(3)}</div>
                             </div>
                             {current > 0 && (
                                <div className={`flex items-center gap-1 text-[10px] font-bold ${diff >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                   <TrendingUp className={`w-3 h-3 ${diff < 0 ? 'rotate-180' : ''}`} />
                                   {Math.abs(diff).toFixed(3)}
                                </div>
                             )}
                          </div>
                       );
                    })}
                 </div>

                 <button 
                   onClick={handleSave}
                   disabled={loading}
                   className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-black font-black rounded-2xl transition-all shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2"
                 >
                    <Send className="w-5 h-5" />
                    اعتماد الأسعار وحفظها
                 </button>
              </motion.div>
           ) : (
              <div className="bg-white/[0.01] border border-white/5 border-dashed rounded-[2.5rem] p-12 text-center flex flex-col items-center justify-center h-full min-h-[400px]">
                 <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-6 opacity-20">
                    <ChevronLeft className="w-10 h-10" />
                 </div>
                 <h4 className="text-zinc-500 font-bold mb-2">بانتظار التحليل</h4>
                 <p className="text-zinc-600 text-xs max-w-[250px] leading-relaxed">بمجرد الضغط على زر التحليل، ستظهر هنا القيم التي تم التعرف عليها بواسطة النظام الذكي لتمكينك من مراجعتها قبل الحفظ.</p>
              </div>
           )}
        </div>
      </div>
    </motion.div>
  );
};
