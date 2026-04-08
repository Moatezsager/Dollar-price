import React, { useMemo, useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Users, Globe, Cpu, Layers, History as HistoryIcon, AlertTriangle, Zap, Stethoscope, ArrowRight 
} from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { AdminStats } from '../../hooks/admin/useAdminData';

interface DashboardTabProps {
  stats: AdminStats | null;
  recentChanges: any[];
  logs: any[];
  config: any;
  onNavigate: (tab: string) => void;
  runDiagnostics: () => void;
  clearRam: () => void;
}

export const DashboardTab: React.FC<DashboardTabProps> = ({ 
  stats, recentChanges, logs, config, onNavigate, runDiagnostics, clearRam 
}) => {
  const [uptimeDisplay, setUptimeDisplay] = useState("");

  useEffect(() => {
    if (!stats?.serverStartTime) return;
    
    const updateUptime = () => {
      const start = new Date(stats.serverStartTime).getTime();
      const now = new Date().getTime();
      const diff = Math.floor((now - start) / 1000);
      
      const days = Math.floor(diff / (24 * 3600));
      const hours = Math.floor((diff % (24 * 3600)) / 3600);
      const minutes = Math.floor((diff % 3600) / 60);
      const seconds = diff % 60;
      
      let display = "";
      if (days > 0) display += `${days} يوم `;
      if (hours > 0 || days > 0) display += `${hours} ساعة `;
      display += `${minutes} دقيقة ${seconds} ثانية`;
      setUptimeDisplay(display);
    };
    
    updateUptime();
    const interval = setInterval(updateUptime, 1000);
    return () => clearInterval(interval);
  }, [stats?.serverStartTime]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-8 pb-24"
    >
      {/* Dashboard Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-white mb-2">مرحباً بك، المدير</h2>
          <p className="text-zinc-500 font-medium">إليك نظرة سريعة على أداء النظام اليوم.</p>
        </div>
        
        {stats && stats.dbConnected === false && (
          <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4 flex items-center gap-4 animate-pulse">
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-6 h-6 text-rose-500" />
            </div>
            <div>
              <h4 className="text-rose-500 font-bold text-sm">قاعدة البيانات غير متصلة</h4>
              <p className="text-rose-500/70 text-xs">يرجى التحقق من متغيرات البيئة (Supabase URL & Key)</p>
            </div>
          </div>
        )}
        <div className="flex items-center gap-3 bg-white/5 p-2 rounded-2xl border border-white/5">
          <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/5 flex flex-col items-center">
             <span className="text-[10px] text-zinc-500 uppercase font-black">Uptime</span>
             <span className="text-xs font-mono text-emerald-400">{uptimeDisplay || "..."}</span>
          </div>
          <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/5 flex flex-col items-center">
             <span className="text-[10px] text-zinc-500 uppercase font-black">Region</span>
             <span className="text-xs font-mono text-blue-400">GER_FRA_01</span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard 
          icon={Users} 
          label="المستخدمين النشطين" 
          value={stats?.onlineUsers || 0} 
          color="emerald" 
          subValue="+12%" 
          badge="Live"
        />
        <StatsCard 
          icon={Globe} 
          label="آخر تحديث للأسعار" 
          value={stats?.minutesSinceLastScrape || 0} 
          color="blue" 
          subValue="دقيقة" 
          badge="Scraper"
        />
        <StatsCard 
          icon={Cpu} 
          label="استهلاك الذاكرة" 
          value={stats?.memoryUsage ? Math.round(stats.memoryUsage.heapUsed / 1024 / 1024) : 0} 
          color="purple" 
          subValue="MB" 
          badge="Health"
        />
        <StatsCard 
          icon={Layers} 
          label="القنوات المفعلة" 
          value={config?.channels?.length || 0} 
          color="amber" 
          subValue="قناة" 
          badge="Data"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] p-8">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center">
                  <HistoryIcon className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-xl font-black">آخر التحديثات</h3>
                  <p className="text-xs text-zinc-500">سجل بآخر 5 تغييرات في الأسعار</p>
                </div>
              </div>
              <button onClick={() => onNavigate('changes')} className="text-xs font-bold text-blue-400 hover:underline">عرض الكل</button>
            </div>

            <div className="space-y-4">
              {recentChanges.slice(0, 5).map((change, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.03] border border-white/5">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-lg">
                      {change.flag || "💰"}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white">{change.name}</div>
                      <div className="text-[10px] text-zinc-500">{format(new Date(change.timestamp), 'HH:mm:ss', { locale: ar })}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-black text-emerald-400" dir="ltr">{change.value}</div>
                    <div className="text-[10px] text-zinc-600 font-mono">{change.channel}</div>
                  </div>
                </div>
              ))}
              {recentChanges.length === 0 && (
                <div className="text-center py-10 text-zinc-600 text-sm italic">لا توجد تغييرات مسجلة حالياً</div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] p-8">
             <h3 className="text-xl font-black mb-6 flex items-center gap-3">
                <Zap className="w-6 h-6 text-amber-400" />
                إجراءات سريعة
             </h3>
             <div className="grid grid-cols-1 gap-3">
                <ActionButton icon={Stethoscope} label="فحص النظام" onClick={runDiagnostics} color="blue" />
                <ActionButton icon={Cpu} label="تنظيف الرام" onClick={clearRam} color="amber" />
                <ActionButton icon={Globe} label="إدارة تليجرام" onClick={() => onNavigate('telegram')} color="purple" />
             </div>
          </div>

          <div className="bg-gradient-to-br from-rose-500/10 to-rose-600/5 border border-rose-500/20 rounded-[2.5rem] p-8">
             <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-rose-500/20 flex items-center justify-center">
                   <AlertTriangle className="w-6 h-6 text-rose-400" />
                </div>
                <div>
                   <h3 className="text-xl font-black">سجل الأخطاء</h3>
                   <p className="text-xs text-rose-500/50">آخر المشاكل التقنية</p>
                </div>
             </div>
             <div className="space-y-3">
                {logs.slice(0, 3).map((log, i) => (
                  <div key={i} className="p-3 rounded-xl bg-rose-500/5 border border-rose-500/10">
                     <div className="text-[10px] font-bold text-rose-400 mb-1">{log.context}</div>
                     <div className="text-[10px] text-zinc-500 line-clamp-1 font-mono">{log.message}</div>
                  </div>
                ))}
                {logs.length === 0 && <div className="text-center py-4 text-zinc-600 text-[10px]">لا توجد أخطاء مسجلة ✅</div>}
                <button onClick={() => onNavigate('logs')} className="w-full py-3 text-xs font-black text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all mt-2">عرض سجل الأخطاء</button>
             </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const StatsCard = ({ icon: Icon, label, value, color, subValue, badge }: any) => {
  const colorMap: any = {
    emerald: "from-emerald-500/10 to-emerald-600/5 border-emerald-500/20 text-emerald-400",
    blue: "from-blue-500/10 to-blue-600/5 border-blue-500/20 text-blue-400",
    purple: "from-purple-500/10 to-purple-600/5 border-purple-500/20 text-purple-400",
    amber: "from-amber-500/10 to-amber-600/5 border-amber-500/20 text-amber-400",
  };
  
  const bgMap: any = {
    emerald: "bg-emerald-500/20",
    blue: "bg-blue-500/20",
    purple: "bg-purple-500/20",
    amber: "bg-amber-500/20",
  }

  return (
    <div className={`bg-gradient-to-br ${colorMap[color]} border rounded-[2rem] p-6 relative overflow-hidden group`}>
      <div className={`absolute top-0 right-0 w-32 h-32 ${bgMap[color]} blur-3xl rounded-full -mr-16 -mt-16 group-hover:opacity-60 transition-all`}></div>
      <div className="flex items-center justify-between mb-4 relative">
        <div className={`w-12 h-12 rounded-2xl ${bgMap[color]} flex items-center justify-center`}>
          <Icon className="w-6 h-6" />
        </div>
        <span className={`text-xs font-black uppercase tracking-tighter opacity-50`}>{badge}</span>
      </div>
      <div className="relative">
        <h3 className="text-zinc-400 text-xs font-bold mb-1">{label}</h3>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-black text-white">{value}</span>
          <span className={`text-xs font-bold opacity-80`}>{subValue}</span>
        </div>
      </div>
    </div>
  );
};

const ActionButton = ({ icon: Icon, label, onClick, color }: any) => {
  const colorMap: any = {
    blue: "text-blue-400",
    amber: "text-amber-400",
    purple: "text-purple-400",
  };

  return (
    <button 
      onClick={onClick}
      className="w-full flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all group"
    >
       <div className="flex items-center gap-3">
          <Icon className={`w-5 h-5 ${colorMap[color]}`} />
          <span className="text-sm font-bold">{label}</span>
       </div>
       <ArrowRight className="w-4 h-4 text-zinc-600 group-hover:translate-x-[-4px] transition-transform" />
    </button>
  );
};
