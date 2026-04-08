import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldCheck, LayoutDashboard, Database, Settings, Code2, Activity, 
  History as HistoryIcon, Zap, Globe, AlertTriangle, Cpu, Menu, X, 
  Save, LogOut, RefreshCw
} from 'lucide-react';
import { TelegramStatus } from '../TelegramStatus';

interface AdminLayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: any) => void;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  logout: () => void;
  stats: any;
  connectionStatus: string;
  onSave: () => void;
  saveLoading: boolean;
  minutesSinceLastScrape: number | null;
  onlineUsers: number;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  children, activeTab, setActiveTab, isSidebarOpen, setIsSidebarOpen, logout, 
  stats, connectionStatus, onSave, saveLoading, minutesSinceLastScrape, onlineUsers
}) => {
  const navItems = [
    { id: 'dashboard', label: 'لوحة التحكم', icon: LayoutDashboard },
    { id: 'database', label: 'قاعدة البيانات', icon: Database },
    { id: 'config', label: 'الإعدادات', icon: Settings },
    { id: 'api', label: 'المطورين', icon: Code2 },
    { id: 'stats', label: 'النشاط', icon: Activity },
    { id: 'changes', label: 'السجل', icon: HistoryIcon },
    { id: 'ai', label: 'قارئ نصوص', icon: Zap },
    { id: 'telegram', label: 'الحساب', icon: Globe },
    { id: 'logs', label: 'الأخطاء', icon: AlertTriangle },
    { id: 'tools', label: 'أدوات', icon: Cpu },
  ];

  return (
    <div className="min-h-screen bg-[#050505] text-white flex font-sans selection:bg-emerald-500/30 overflow-hidden" dir="rtl">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex flex-col w-72 bg-[#080808] border-l border-white/5 relative z-[60]">
        <div className="p-8">
          <div className="flex items-center gap-4 mb-10">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-blue-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <ShieldCheck className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight text-white leading-tight">مركز الإدارة</h1>
              <span className="text-emerald-500 text-[10px] font-bold uppercase tracking-widest">Version 4.0</span>
            </div>
          </div>

          <nav className="space-y-1.5">
            {navItems.map(item => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-bold transition-all group ${
                  activeTab === item.id 
                    ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20' 
                    : 'text-zinc-500 hover:text-white hover:bg-white/5'
                }`}
              >
                <item.icon className={`w-5 h-5 ${activeTab === item.id ? 'stroke-[2.5]' : 'group-hover:scale-110 transition-transform'}`} />
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="mt-auto p-6 border-t border-white/5">
           <div className="bg-white/5 rounded-2xl p-4 mb-4">
              <div className="flex items-center gap-3 mb-3">
                 <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                    <Database className="w-4 h-4 text-blue-400" />
                 </div>
                 <span className="text-xs font-bold text-zinc-400">حالة النظام</span>
              </div>
              <div className="space-y-2">
                 <div className="flex justify-between text-[10px]">
                    <span className="text-zinc-500">الاتصال:</span>
                    <span className={connectionStatus === 'online' ? 'text-emerald-400' : 'text-rose-400'}>
                       {connectionStatus === 'online' ? 'متصل' : 'منقطع'}
                    </span>
                 </div>
                 <div className="flex justify-between text-[10px]">
                    <span className="text-zinc-500">الذاكرة:</span>
                    <span className="text-blue-400">{stats?.memoryUsage ? `${Math.round(stats.memoryUsage.heapUsed / 1024 / 1024)}MB` : '...'}</span>
                 </div>
              </div>
           </div>
           
           <button
              onClick={logout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold text-rose-400 hover:bg-rose-500/10 transition-all border border-rose-500/10"
           >
             <LogOut className="w-5 h-5" />
             تسجيل الخروج
           </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Top Header */}
        <header className="h-20 bg-[#050505]/80 backdrop-blur-2xl border-b border-white/5 flex items-center justify-between px-6 shrink-0 relative z-50">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2.5 rounded-xl bg-white/5 text-zinc-400 hover:text-white transition-all"
            >
              <Menu className="w-6 h-6" />
            </button>
            
            <div className="hidden md:flex items-center gap-3">
               <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/5 rounded-full">
                  <div className={`w-2 h-2 rounded-full ${minutesSinceLastScrape && minutesSinceLastScrape < 15 ? 'bg-emerald-500' : 'bg-rose-500 animate-pulse'}`}></div>
                  <span className="text-[10px] font-bold text-zinc-400">تيليجرام: {minutesSinceLastScrape ? `منذ ${minutesSinceLastScrape}د` : '---'}</span>
               </div>
               <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/5 rounded-full">
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  <span className="text-[10px] font-bold text-zinc-400">المستخدمين: {onlineUsers}</span>
               </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
             <TelegramStatus />
             <div className="w-px h-6 bg-white/10 mx-2 hidden sm:block"></div>
             <button
               onClick={onSave}
               disabled={saveLoading}
               className="px-5 py-2.5 rounded-xl bg-white text-black font-black flex items-center gap-2 hover:bg-emerald-400 transition-all active:scale-95 disabled:opacity-50 text-sm shadow-xl shadow-white/5"
             >
               <Save className="w-4 h-4" />
               <span>حفظ التغييرات</span>
             </button>
          </div>
        </header>

        {/* Mobile Sidebar */}
        <AnimatePresence>
          {isSidebarOpen && (
            <>
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsSidebarOpen(false)}
                className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] lg:hidden"
              />
              <motion.aside 
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                className="fixed top-0 right-0 bottom-0 w-80 bg-[#080808] z-[110] lg:hidden p-8 flex flex-col shadow-2xl"
              >
                <div className="flex items-center justify-between mb-10">
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="w-8 h-8 text-emerald-500" />
                    <span className="font-black text-xl">القائمة</span>
                  </div>
                  <button onClick={() => setIsSidebarOpen(false)} className="p-2 rounded-xl bg-white/5">
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <nav className="space-y-2">
                  {navItems.map(item => (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveTab(item.id);
                        setIsSidebarOpen(false);
                      }}
                      className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-sm font-bold transition-all ${
                        activeTab === item.id 
                          ? 'bg-emerald-500 text-black' 
                          : 'text-zinc-500 hover:bg-white/5'
                      }`}
                    >
                      <item.icon className="w-5 h-5" />
                      {item.label}
                    </button>
                  ))}
                </nav>

                <div className="mt-auto">
                  <button
                    onClick={logout}
                    className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-sm font-bold text-rose-400 bg-rose-500/5 border border-rose-500/10"
                  >
                    <LogOut className="w-5 h-5" />
                    تسجيل الخروج
                  </button>
                </div>
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* Content Viewport */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 relative">
          {children}
        </main>
      </div>
    </div>
  );
};
