import React from 'react';
import { motion } from 'motion/react';
import { AlertTriangle, Trash2, RefreshCw, Clock, Terminal, ChevronRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';

interface LogsTabProps {
  logs: any[];
  onRefresh: () => void;
  onClear: () => void;
  loading: boolean;
}

export const LogsTab: React.FC<LogsTabProps> = ({ logs, onRefresh, onClear, loading }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6 pb-24"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/10 flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-rose-400" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white uppercase tracking-tight">سجل الأخطاء</h2>
            <p className="text-zinc-500 text-xs font-bold mt-1">تتبع المشاكل التقنية واستجابة السيرفر</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={onRefresh}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-sm font-bold transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            تحديث
          </button>
          <button 
            onClick={onClear}
            className="flex items-center gap-2 px-4 py-2 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 rounded-xl text-sm font-bold transition-all"
          >
            <Trash2 className="w-4 h-4" />
            تنظيف الكل
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {logs.map((log, i) => (
          <div key={i} className="group bg-white/[0.02] border border-white/5 rounded-[1.5rem] p-6 hover:bg-white/[0.04] transition-all flex flex-col md:flex-row md:items-start gap-4">
             <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center shrink-0">
                <Terminal className="w-5 h-5 text-rose-400" />
             </div>
             <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-2">
                   <span className="text-xs font-black text-rose-500 bg-rose-500/10 px-3 py-1 rounded-full">{log.context}</span>
                   <span className="text-[10px] text-zinc-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDistanceToNow(new Date(log.created_at || log.timestamp), { addSuffix: true, locale: ar })}
                   </span>
                </div>
                <p className="text-sm text-zinc-300 font-mono leading-relaxed" dir="ltr">{log.message}</p>
                {log.stack && (
                  <div className="mt-4 p-4 bg-black/40 rounded-xl border border-white/5 overflow-x-auto">
                     <pre className="text-[10px] text-zinc-500 font-mono">{log.stack}</pre>
                  </div>
                )}
             </div>
             <button className="hidden group-hover:flex p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-all">
                <ChevronRight className="w-5 h-5 text-zinc-500" />
             </button>
          </div>
        ))}

        {logs.length === 0 && (
          <div className="py-20 text-center text-zinc-600 flex flex-col items-center gap-4">
             <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                <RefreshCw className="w-8 h-8" />
             </div>
             <p className="font-bold">لا توجد أخطاء حالياً. النظام يعمل بسلاسة!</p>
          </div>
        )}
      </div>
    </motion.div>
  );
};
