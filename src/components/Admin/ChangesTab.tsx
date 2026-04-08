import React, { useState } from 'react';
import { motion } from 'motion/react';
import { History as HistoryIcon, Trash2, Search, Filter, ArrowUpRight, ArrowDownRight, Clock, Send, Globe } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface ChangesTabProps {
  recentChanges: any[];
  onClear: () => void;
  loading: boolean;
}

export const ChangesTab: React.FC<ChangesTabProps> = ({ recentChanges, onClear, loading }) => {
  const [searchTerm, setSearchTerm] = useState("");

  const filtered = recentChanges.filter(c => 
    c.name?.includes(searchTerm) || 
    c.channel?.includes(searchTerm) ||
    c.currency_code?.includes(searchTerm)
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6 pb-24"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center">
            <HistoryIcon className="w-8 h-8 text-blue-400" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white uppercase tracking-tight">سجل التغيرات</h2>
            <p className="text-zinc-500 text-xs font-bold mt-1">تتبع تاريخ تغير الأسعار والمصادر</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
             <input 
                type="text" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="بحث في السجل..."
                className="bg-white/5 border border-white/5 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500/30 w-full md:w-64"
             />
          </div>
          <button 
            onClick={onClear}
            className="flex items-center gap-2 px-4 py-2.5 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 rounded-xl text-xs font-black transition-all"
          >
            <Trash2 className="w-4 h-4" />
            تنظيف السجل
          </button>
        </div>
      </div>

      <div className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] overflow-hidden">
         <div className="overflow-x-auto">
            <table className="w-full text-right">
               <thead>
                  <tr className="bg-white/[0.01] border-b border-white/5 text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
                     <th className="px-8 py-5">العملة / المسمى</th>
                     <th className="px-6 py-5">السعر القديم</th>
                     <th className="px-6 py-5">السعر الجديد</th>
                     <th className="px-6 py-5">المقدار</th>
                     <th className="px-6 py-5 text-left">الوقت والمصدر</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-white/5">
                  {filtered.map((change, i) => {
                     const diff = (change.new_price || change.value) - (change.old_price || 0);
                     const isUp = diff >= 0;
                     
                     return (
                        <tr key={i} className="hover:bg-white/[0.01] transition-colors">
                           <td className="px-8 py-5">
                              <div className="flex items-center gap-3">
                                 <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center text-lg shadow-inner">
                                    {change.flag || "💰"}
                                 </div>
                                 <div>
                                    <div className="text-sm font-bold text-white">{change.name || change.currency_name}</div>
                                    <div className="text-[10px] text-zinc-500 font-mono" dir="ltr">{change.currency_code}</div>
                                 </div>
                              </div>
                           </td>
                           <td className="px-6 py-5 text-sm font-mono text-zinc-500">{(change.old_price || 0).toFixed(2)}</td>
                           <td className="px-6 py-5 text-sm font-black text-white font-mono">{(change.new_price || change.value).toFixed(2)}</td>
                           <td className="px-6 py-5">
                              <div className={`flex items-center gap-1 text-xs font-bold ${isUp ? 'text-emerald-500' : 'text-rose-500'}`}>
                                 {isUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                                 {Math.abs(diff).toFixed(2)}
                              </div>
                           </td>
                           <td className="px-8 py-5 text-left">
                              <div className="flex flex-col items-end">
                                 <div className="text-[10px] text-zinc-400 flex items-center gap-1 mb-1 font-bold">
                                    <Clock className="w-3 h-3" />
                                    {format(new Date(change.timestamp || change.created_at), 'HH:mm:ss', { locale: ar })}
                                 </div>
                                 <div className="text-[10px] text-zinc-600 flex items-center gap-1 font-mono">
                                    <Globe className="w-3 h-3" />
                                    {change.channel || change.source}
                                 </div>
                              </div>
                           </td>
                        </tr>
                     );
                  })}
               </tbody>
            </table>
         </div>
         {filtered.length === 0 && (
           <div className="p-20 text-center text-zinc-600 flex flex-col items-center gap-4">
              <HistoryIcon className="w-12 h-12 opacity-10" />
              <p className="text-sm italic">لا توجد سجلات مطابقة للبحث</p>
           </div>
         )}
      </div>
    </motion.div>
  );
};
