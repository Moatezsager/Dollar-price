import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Settings, Save, Plus, Trash2, ArrowRight, ShieldCheck, LogOut, X, 
  Activity, Users, Cpu, History as HistoryIcon, AlertTriangle, Terminal, 
  ArrowLeftRight, CheckCircle2, RefreshCw, Layers, Globe, Zap, Search,
  ChevronDown, ChevronUp, Clock, Info, Building2, Coins, Send, Building
} from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { logErrorToServer } from "./utils/logger";
import { FlagIcon } from "./components/FlagIcon";

interface Stats {
  onlineUsers: number;
  lastSuccessfulScrape: string;
  minutesSinceLastScrape: number;
  channelsCount: number;
  termsCount: number;
  serverUptime: number;
  memoryUsage: { rss: number; heapUsed: number; heapTotal: number };
}

const extractKeywordsAndSuffix = (regex: string) => {
  try {
    const match = regex.match(/^\(\?\:(.+?)\)(.*)$/);
    if (match) {
      return {
        keywords: match[1].split('|').filter(Boolean),
        suffix: match[2]
      };
    }
  } catch (e) {}
  return { keywords: [], suffix: regex };
};

export default function Admin() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [password, setPassword] = useState("");
  const [token, setToken] = useState(() => {
    try {
      return localStorage.getItem("adminToken") || "";
    } catch (e) { return ""; }
  });
  const [config, setConfig] = useState<any>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [activeTab, setActiveTab] = useState<'config' | 'stats' | 'logs'>('config');
  const [isAuthorizedDevice, setIsAuthorizedDevice] = useState(true);

  const [expandedTermIdx, setExpandedTermIdx] = useState<number | null>(null);
  const [testTexts, setTestTexts] = useState<Record<number, string>>({});
  const [newKeywords, setNewKeywords] = useState<Record<number, string>>({});
  const [searchPath, setSearchPath] = useState("");

  useEffect(() => {
    let deviceToken = null;
    try {
      deviceToken = localStorage.getItem("admin_device_token");
    } catch (e) { console.warn("LocalStorage not available", e); }
    
    // In actual production, this would be a more complex check
    if (localStorage.getItem("is_dev") !== "true" && deviceToken !== "authorized_device_token_xyz") {
      // Temporarily allowing if is_dev is set to true for easy initial setup
      if (!deviceToken) {
         console.warn("Device not authorized for admin panel");
      }
    }

    if (token) {
      fetchData();
      const interval = setInterval(fetchStats, 10000);
      return () => clearInterval(interval);
    }
  }, [token]);

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([fetchConfig(), fetchStats(), fetchLogs()]);
    setLoading(false);
  };

  const fetchConfig = async () => {
    try {
      const res = await fetch("/api/admin/config", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
        setIsLoggedIn(true);
      } else {
        setIsLoggedIn(false);
        try { localStorage.removeItem("adminToken"); } catch (e) {}
        setToken("");
      }
    } catch (err) {
      logErrorToServer(err, "Admin.tsx: fetchConfig");
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/admin/stats", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.warn("Stats fetch failed");
      logErrorToServer(err, "Admin.tsx: fetchStats");
    }
  };

  const fetchLogs = async () => {
    try {
      const res = await fetch("/api/admin/error-logs", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setLogs(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.warn("Logs fetch failed");
      logErrorToServer(err, "Admin.tsx: fetchLogs");
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password })
      });
      const data = await res.json();
      if (data.success) {
        setToken(data.token);
        try {
          localStorage.setItem("adminToken", data.token);
          // Auto-authorize device on successful password login
          localStorage.setItem("admin_device_token", "authorized_device_token_xyz");
        } catch (e) {}
        setIsLoggedIn(true);
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError("خطأ في الاتصال بالسيرفر");
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/admin/config", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(config)
      });
      const data = await res.json();
      if (data.success) {
        setSuccess("تم حفظ الإعدادات بنجاح وتحديث السيرفر!");
        setTimeout(() => setSuccess(""), 3000);
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError("خطأ في عملية الحفظ");
    }
    setLoading(false);
  };

  const triggerRefresh = async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/admin/refresh", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setSuccess("تم تحديث البيانات بنجاح!");
        fetchStats();
        setTimeout(() => setSuccess(""), 3000);
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError("فشل تحديث البيانات");
    }
    setRefreshing(false);
  };

  const handleLogout = () => {
    try { localStorage.removeItem("adminToken"); } catch (e) {}
    setToken("");
    setIsLoggedIn(false);
  };

  const filteredTerms = useMemo(() => {
    if (!config?.terms) return [];
    if (!searchPath) return config.terms;
    return config.terms.filter((t: any) => 
      t.name.toLowerCase().includes(searchPath.toLowerCase()) || 
      t.id.toLowerCase().includes(searchPath.toLowerCase())
    );
  }, [config, searchPath]);

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4" dir="rtl">
        <div className="absolute inset-0 bg-emerald-500/5 blur-[120px] rounded-full"></div>
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-[#0a0a0a] border border-white/10 p-8 rounded-[2.5rem] w-full max-w-md shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] relative overflow-hidden backdrop-blur-xl"
        >
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-emerald-500 via-blue-500 to-emerald-500 bg-[length:200%_100%] animate-pulse"></div>
          
          <div className="flex justify-center mb-10">
            <div className="relative">
              <div className="w-20 h-20 rounded-3xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 rotate-3">
                <ShieldCheck className="w-10 h-10 text-emerald-400 -rotate-3" />
              </div>
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-emerald-500 rounded-full border-4 border-[#0a0a0a] animate-ping opacity-20"></div>
            </div>
          </div>

          <div className="text-center mb-10">
            <h1 className="text-3xl font-black text-white mb-3 tracking-tight">الدخول الآمن</h1>
            <p className="text-zinc-500 text-sm leading-relaxed">يرجى تسجيل الدخول للوصول إلى لوحة التحكم المتطورة</p>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="relative group">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="كلمة المرور الإدارية"
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-emerald-500/50 focus:bg-white/[0.08] transition-all text-center text-lg tracking-[0.5em] font-mono placeholder:tracking-normal placeholder:font-sans"
                dir="ltr"
                required
              />
              <div className="absolute inset-0 rounded-2xl border border-emerald-500/0 group-focus-within:border-emerald-500/20 pointer-events-none transition-all"></div>
            </div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-rose-500/10 border border-rose-500/20 px-4 py-3 rounded-xl text-rose-400 text-sm text-center flex items-center justify-center gap-2"
              >
                <AlertTriangle className="w-4 h-4" />
                {error}
              </motion.div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-800 text-black font-black py-4 rounded-2xl transition-all shadow-lg shadow-emerald-500/20 active:scale-[0.98] flex items-center justify-center gap-3 group"
            >
              {loading ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <span>تأكيد الملحقية</span>
                  <Zap className="w-4 h-4 group-hover:fill-current transition-all" />
                </>
              )}
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  if (!config) return null;

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col font-sans" dir="rtl">
      {/* Dynamic Header */}
      <header className="sticky top-0 z-50 bg-[#050505]/80 backdrop-blur-xl border-b border-white/5 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-blue-600 flex items-center justify-center shadow-lg shadow-emerald-900/20">
              <Settings className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight flex items-center gap-2">
                لوحة التحكم <span className="text-emerald-500 text-xs font-mono px-2 py-0.5 bg-emerald-500/10 rounded-full">v2.0</span>
              </h1>
              <div className="flex items-center gap-3 text-xs text-zinc-500 mt-0.5">
                <span className="flex items-center gap-1"><Activity className="w-3 h-3 text-emerald-500" /> المتصلون الآن: {stats?.onlineUsers || 0}</span>
                <span className="w-1 h-1 bg-zinc-700 rounded-full"></span>
                <span className="flex items-center gap-1"><RefreshCw className={`w-3 h-3 ${stats && stats.minutesSinceLastScrape > 30 ? 'text-rose-500' : 'text-emerald-500'}`} /> {stats?.minutesSinceLastScrape || 0} دقيقة</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-white/5 p-1 rounded-2xl border border-white/5">
            {[
              { id: 'config', label: 'الإعدادات', icon: Settings },
              { id: 'stats', label: 'الإحصائيات', icon: Activity },
              { id: 'logs', label: 'السجلات', icon: Terminal },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  activeTab === tab.id 
                    ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20' 
                    : 'text-zinc-500 hover:text-white hover:bg-white/5'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <button
               onClick={triggerRefresh}
               disabled={refreshing}
               className={`p-3 rounded-xl border border-white/5 hover:bg-white/5 transition-all relative group ${refreshing ? 'animate-pulse' : ''}`}
               title="تحديث البيانات يدويًا"
            >
              <RefreshCw className={`w-5 h-5 text-emerald-400 ${refreshing ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-700'}`} />
            </button>
            <div className="w-px h-8 bg-white/10 mx-1"></div>
            <button
              onClick={handleLogout}
              className="p-3 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/10 hover:bg-rose-500/20 transition-all"
              title="خروج"
            >
              <LogOut className="w-5 h-5" />
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="px-6 py-3 rounded-xl bg-white text-black font-black flex items-center gap-2 hover:bg-emerald-400 transition-all active:scale-95 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>حفظ النظام</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6">
        <AnimatePresence mode="wait">
          {activeTab === 'config' && (
            <motion.div 
              key="config"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-8"
            >
              {/* Sidebar Config */}
              <div className="lg:col-span-4 space-y-4 md:space-y-6">
                <section className="bg-white/[0.02] border border-white/5 rounded-2xl md:rounded-[2rem] p-4 md:p-8">
                  <div className="flex items-center justify-between mb-6 md:mb-8">
                    <h2 className="text-lg md:text-xl font-black flex items-center gap-2 md:gap-3 text-emerald-400">
                      <Globe className="w-5 h-5 md:w-6 md:h-6" />
                      مصادر البيانات
                    </h2>
                    <button
                      onClick={() => setConfig({ ...config, channels: [...config.channels, ""] })}
                      className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center hover:bg-emerald-500/20 transition-all"
                    >
                      <Plus className="w-4 h-4 md:w-5 md:h-5" />
                    </button>
                  </div>
                  <p className="text-xs md:text-sm text-zinc-500 mb-4 md:mb-6 font-medium">نظام قنوات تليجرام التي يتم مراقبتها آلياً</p>
                  <div className="space-y-3 md:space-y-4">
                    {config.channels.map((channel: string, idx: number) => (
                      <div key={idx} className="group relative flex items-center gap-2 md:gap-3">
                        <div className="absolute -right-2 md:-right-3 top-1/2 -translate-y-1/2 w-1 h-0 group-focus-within:h-6 bg-emerald-500 transition-all rounded-full"></div>
                        <span className="text-[9px] md:text-[10px] text-zinc-600 font-mono uppercase tracking-tighter shrink-0 pt-0.5">TG</span>
                        <input
                          type="text"
                          value={channel}
                          onChange={(e) => {
                            const newChannels = [...config.channels];
                            newChannels[idx] = e.target.value;
                            setConfig({ ...config, channels: newChannels });
                          }}
                          className="flex-1 bg-white/[0.03] border border-white/5 rounded-lg md:rounded-xl px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm focus:outline-none focus:border-emerald-500/50 focus:bg-white/5 transition-all font-mono"
                          dir="ltr"
                          placeholder="channel_name"
                        />
                        <button
                          onClick={() => {
                            const newChannels = config.channels.filter((_: any, i: number) => i !== idx);
                            setConfig({ ...config, channels: newChannels });
                          }}
                          className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl text-zinc-600 hover:text-rose-400 hover:bg-rose-500/5 transition-all opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </section>
              </div>

              {/* Main Terms Area */}
              <div className="lg:col-span-8 space-y-4 md:space-y-6">
                <section className="bg-white/[0.02] border border-white/5 rounded-2xl md:rounded-[2rem] p-4 md:p-8">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 md:gap-6 mb-6 md:mb-10">
                    <div>
                      <h2 className="text-xl md:text-2xl font-black text-blue-400 flex items-center gap-2 md:gap-3">
                        <Layers className="w-6 h-6 md:w-7 md:h-7" />
                        نظام التعرف الذكي
                      </h2>
                      <p className="text-xs md:text-sm text-zinc-500 mt-1 md:mt-2 font-medium">تحكم في الكلمات الدلالية وقواعد البحث البرمجية</p>
                    </div>
                    <button
                      onClick={() => setConfig({
                        ...config,
                        terms: [...config.terms, { id: "NEW", name: "عملة جديدة", regex: "(?:كلمة|أخرى)\\s*[=:]?\\s*(\\d{1,2}(?:[\\.,]\\d+)?)", min: 0.1, max: 100, isInverse: false, flag: "" }]
                      })}
                      className="w-full sm:w-auto px-4 md:px-6 py-3 rounded-xl md:rounded-2xl bg-blue-600 text-white font-black hover:bg-blue-500 transition-all active:scale-95 shadow-lg shadow-blue-900/40 flex items-center justify-center gap-2 shrink-0"
                    >
                      <Plus className="w-4 h-4 md:w-5 md:h-5 font-black" />
                      إضافة عملة
                    </button>
                  </div>

                  {/* Search bar */}
                  <div className="relative mb-8 group">
                    <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-600 group-focus-within:text-blue-400 transition-colors" />
                    <input 
                      type="text" 
                      placeholder="ابحث عن عملة أو معرف..."
                      value={searchPath}
                      onChange={(e) => setSearchPath(e.target.value)}
                      className="w-full bg-white/[0.03] border border-white/10 rounded-2xl pr-12 pl-4 py-4 text-sm focus:outline-none focus:border-blue-500/50 transition-all focus:bg-white/5"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    {filteredTerms.map((term: any, originalIdx: number) => {
                      const idx = config.terms.findIndex((t: any) => t === term);
                      const isExpanded = expandedTermIdx === idx;
                      const testText = testTexts[idx] || "";
                      let testResult: string | null = null;
                      
                      if (testText && term.regex) {
                        try {
                          const regex = new RegExp(term.regex, 'i');
                          const match = testText.match(regex);
                          if (match && match[1]) {
                            let val = parseFloat(match[1].replace(',', '.'));
                            if (term.isInverse && val > 0) val = 1 / val;
                            if (!isNaN(val) && val >= term.min && val <= term.max) {
                              testResult = `✅ تم الاستخراج: ${val.toFixed(4)}`;
                            } else {
                              testResult = `⚠️ الرقم (${val}) خارج النطاق (${term.min}-${term.max})`;
                            }
                          } else { testResult = "❌ لم يتم العثور على تطابق"; }
                        } catch (e) { testResult = "❌ خطأ في صيغة Regex"; }
                      }

                      return (
                        <div 
                          key={`term-${idx}`} 
                          className={`rounded-3xl border transition-all duration-300 ${
                            isExpanded ? 'border-blue-500/40 bg-blue-500/5' : 'border-white/5 bg-white/[0.01] hover:bg-white/[0.03]'
                          }`}
                        >
                          <div 
                            className="flex items-center justify-between p-5 cursor-pointer select-none"
                            onClick={() => setExpandedTermIdx(isExpanded ? null : idx)}
                          >
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 group-hover:scale-105 transition-transform overflow-hidden">
                                <FlagIcon flagCode={term.flag} name="flag" className="w-8 h-8" fallbackType="coins" />
                              </div>
                              <div>
                                <h3 className="text-lg font-black text-white">{term.name}</h3>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest">{term.id}</span>
                                  <span className="w-1 h-1 bg-zinc-800 rounded-full"></span>
                                  <span className="text-[10px] text-zinc-500 font-mono" dir="ltr">{term.min}-{term.max}</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="hidden sm:flex items-center gap-2 text-[10px] font-mono text-zinc-600 bg-white/5 px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity">
                                REGEX
                              </div>
                              {isExpanded ? <ChevronUp className="w-5 h-5 text-zinc-400" /> : <ChevronDown className="w-5 h-5 text-zinc-600" />}
                            </div>
                          </div>

                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div 
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                              >
                                <div className="p-6 pt-0 border-t border-white/5 mt-2">
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6">
                                    <div className="space-y-6">
                                      <div className="grid grid-cols-2 gap-4">
                                        <div>
                                          <label className="block text-[10px] text-zinc-500 font-bold uppercase mb-2 tracking-widest px-1">المعرف البرمجي (ID)</label>
                                          <input
                                            type="text"
                                            value={term.id}
                                            onChange={(e) => {
                                              const newTerms = [...config.terms];
                                              newTerms[idx].id = e.target.value;
                                              setConfig({ ...config, terms: newTerms });
                                            }}
                                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-mono focus:border-blue-500/50 outline-none"
                                            dir="ltr"
                                          />
                                        </div>
                                        <div>
                                          <label className="block text-[10px] text-zinc-500 font-bold uppercase mb-2 tracking-widest px-1">الاسم التجاري</label>
                                          <input
                                            type="text"
                                            value={term.name}
                                            onChange={(e) => {
                                              const newTerms = [...config.terms];
                                              newTerms[idx].name = e.target.value;
                                              setConfig({ ...config, terms: newTerms });
                                            }}
                                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:border-blue-500/50"
                                          />
                                        </div>
                                      </div>

                                      <div className="grid grid-cols-2 gap-4">
                                        <div>
                                          <label className="block text-[10px] text-zinc-500 font-bold uppercase mb-2 tracking-widest px-1">الحد الأدنى (د.ل)</label>
                                          <input
                                            type="number"
                                            step="0.01"
                                            value={term.min}
                                            onChange={(e) => {
                                              const newTerms = [...config.terms];
                                              newTerms[idx].min = parseFloat(e.target.value);
                                              setConfig({ ...config, terms: newTerms });
                                            }}
                                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-center font-mono outline-none"
                                            dir="ltr"
                                          />
                                        </div>
                                        <div>
                                          <label className="block text-[10px] text-zinc-500 font-bold uppercase mb-2 tracking-widest px-1">الحد الأقصى (د.ل)</label>
                                          <input
                                            type="number"
                                            step="0.01"
                                            value={term.max}
                                            onChange={(e) => {
                                              const newTerms = [...config.terms];
                                              newTerms[idx].max = parseFloat(e.target.value);
                                              setConfig({ ...config, terms: newTerms });
                                            }}
                                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-center font-mono outline-none"
                                            dir="ltr"
                                          />
                                        </div>
                                      </div>

                                      <div>
                                        <label className="block text-[10px] text-zinc-500 font-bold uppercase mb-2 tracking-widest px-1">كود العلم (Flags)</label>
                                        <div className="flex items-center gap-3">
                                          <input
                                            type="text"
                                            value={term.flag || ""}
                                            onChange={(e) => {
                                              const newTerms = [...config.terms];
                                              newTerms[idx].flag = e.target.value;
                                              setConfig({ ...config, terms: newTerms });
                                            }}
                                            placeholder="eg, us, eu, tr, ae, cn"
                                            className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-mono outline-none"
                                            dir="ltr"
                                          />
                                          <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden">
                                            <FlagIcon flagCode={term.flag} name="flag" className="w-6 h-6" fallbackType="coins" />
                                          </div>
                                        </div>
                                      </div>
                                    </div>

                                    <div className="space-y-6 flex flex-col">
                                      {/* Keywords Editor (Improved) */}
                                      <div className="bg-black/40 border border-white/5 rounded-2xl p-4 flex-1">
                                        <div className="flex items-center justify-between mb-4">
                                          <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">الكلمات الدلالية للبحث</label>
                                          <Info className="w-4 h-4 text-zinc-700 hover:text-blue-400 cursor-help" title="الكلمات التي يبحث عنها النظام للتعرف على العملة" />
                                        </div>
                                        
                                        {/* Visual Keyword Editor */}
                                        <div className="mb-4">
                                          <div className="flex flex-wrap gap-2 mb-3">
                                            {extractKeywordsAndSuffix(term.regex).keywords.map((kw, kIdx) => (
                                              <span key={kIdx} className="flex items-center gap-1 bg-blue-500/10 text-blue-400 px-2.5 py-1 rounded-lg text-xs font-medium border border-blue-500/20">
                                                {kw}
                                                <button 
                                                  onClick={() => {
                                                    const { keywords, suffix } = extractKeywordsAndSuffix(term.regex);
                                                    const updated = keywords.filter((_, i) => i !== kIdx);
                                                    const newTerms = [...config.terms];
                                                    newTerms[idx].regex = updated.length > 0 ? `(?:${updated.join('|')})${suffix}` : suffix;
                                                    setConfig({ ...config, terms: newTerms });
                                                  }}
                                                  className="hover:text-rose-400 hover:bg-rose-500/10 rounded-full p-0.5 transition-colors"
                                                >
                                                  <X className="w-3 h-3" />
                                                </button>
                                              </span>
                                            ))}
                                          </div>
                                          <div className="flex gap-2">
                                            <input
                                              type="text"
                                              placeholder="إضافة كلمة جديدة..."
                                              value={newKeywords[idx] || ""}
                                              onChange={(e) => setNewKeywords({ ...newKeywords, [idx]: e.target.value })}
                                              onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                  e.preventDefault();
                                                  const kw = newKeywords[idx]?.trim();
                                                  if (kw) {
                                                    const { keywords, suffix } = extractKeywordsAndSuffix(term.regex);
                                                    if (!keywords.includes(kw)) {
                                                      const updated = [...keywords, kw];
                                                      const newTerms = [...config.terms];
                                                      newTerms[idx].regex = `(?:${updated.join('|')})${suffix}`;
                                                      setConfig({ ...config, terms: newTerms });
                                                    }
                                                    setNewKeywords({ ...newKeywords, [idx]: "" });
                                                  }
                                                }
                                              }}
                                              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-500/50"
                                            />
                                            <button
                                              onClick={() => {
                                                const kw = newKeywords[idx]?.trim();
                                                if (kw) {
                                                  const { keywords, suffix } = extractKeywordsAndSuffix(term.regex);
                                                  if (!keywords.includes(kw)) {
                                                    const updated = [...keywords, kw];
                                                    const newTerms = [...config.terms];
                                                    newTerms[idx].regex = `(?:${updated.join('|')})${suffix}`;
                                                    setConfig({ ...config, terms: newTerms });
                                                  }
                                                  setNewKeywords({ ...newKeywords, [idx]: "" });
                                                }
                                              }}
                                              className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-2 rounded-xl text-xs font-bold transition-colors"
                                            >
                                              إضافة
                                            </button>
                                          </div>
                                        </div>

                                        {/* Advanced Regex Editor (Collapsible) */}
                                        <details className="group mt-4">
                                          <summary className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest cursor-pointer hover:text-zinc-300 transition-colors flex items-center gap-2 select-none mb-2">
                                            <span>محرر REGEX المتقدم</span>
                                            <ChevronDown className="w-3 h-3 group-open:rotate-180 transition-transform" />
                                          </summary>
                                          <textarea
                                            value={term.regex}
                                            onChange={(e) => {
                                              const newTerms = [...config.terms];
                                              newTerms[idx].regex = e.target.value;
                                              setConfig({ ...config, terms: newTerms });
                                            }}
                                            className="w-full h-20 bg-transparent border border-white/10 rounded-xl px-4 py-3 text-xs font-mono text-emerald-400 focus:border-blue-500/50 outline-none resize-none leading-relaxed"
                                            dir="ltr"
                                          />
                                        </details>
                                        
                                        <div className="mt-6 flex flex-col gap-3">
                                          <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">تجربة فورية</label>
                                          <input
                                            type="text"
                                            placeholder="أدخل نصًا للتجربة..."
                                            value={testText}
                                            onChange={(e) => setTestTexts({ ...testTexts, [idx]: e.target.value })}
                                            className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-xs outline-none focus:border-blue-500/30"
                                          />
                                          {testText && (
                                            <div className={`px-4 py-2 rounded-xl text-xs font-bold font-mono text-right transition-colors ${
                                              testResult?.startsWith('✅') ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                                            }`}>
                                              {testResult}
                                            </div>
                                          )}
                                        </div>
                                      </div>

                                      <button
                                        onClick={() => {
                                          const newTerms = config.terms.filter((_: any, i: number) => i !== idx);
                                          setConfig({ ...config, terms: newTerms });
                                          setExpandedTermIdx(null);
                                        }}
                                        className="w-full py-3 rounded-2xl bg-rose-500/10 text-rose-500 hover:bg-rose-500 text-sm font-bold transition-all hover:text-black mt-2"
                                      >
                                        حذف هذه العملة نهائياً
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>
                </section>
                
                {/* Mobile Save Button */}
                <div className="block lg:hidden sticky bottom-4 z-40">
                  <button
                    onClick={handleSave}
                    disabled={loading}
                    className="w-full py-4 rounded-2xl bg-emerald-500 text-black font-black flex items-center justify-center gap-2 hover:bg-emerald-400 transition-all active:scale-95 shadow-xl shadow-emerald-500/20 disabled:opacity-50"
                  >
                    <Save className="w-5 h-5" />
                    <span>حفظ التغييرات</span>
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'stats' && (
            <motion.div 
              key="stats"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { label: "المستخدمون الآن", value: stats?.onlineUsers || 0, icon: Users, color: "emerald" },
                  { label: "قنوات المراقبة", value: stats?.channelsCount || 0, icon: Globe, color: "blue" },
                  { label: "إجمالي العملات", value: stats?.termsCount || 0, icon: Layers, color: "purple" },
                  { label: "نشاط السيرفر (Uptime)", value: stats?.serverUptime ? (stats.serverUptime / 3600).toFixed(1) + " ساعة" : "---", icon: Cpu, color: "amber" }
                ].map((stat, i) => (
                  <div key={i} className="bg-white/[0.02] border border-white/5 rounded-3xl p-8 relative overflow-hidden group">
                    <div className={`absolute top-0 right-0 p-8 text-${stat.color}-500/5 group-hover:scale-110 transition-transform duration-700`}>
                      <stat.icon className="w-24 h-24" />
                    </div>
                    <div className={`w-12 h-12 rounded-2xl bg-${stat.color}-500/10 flex items-center justify-center text-${stat.color}-400 mb-6 border border-${stat.color}-500/10 shadow-lg`}>
                      <stat.icon className="w-6 h-6" />
                    </div>
                    <p className="text-zinc-500 text-sm font-medium mb-1">{stat.label}</p>
                    <h3 className="text-3xl font-black text-white">{stat.value}</h3>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <section className="bg-white/[0.02] border border-white/5 rounded-[2rem] p-8">
                  <h2 className="text-xl font-black mb-8 flex items-center gap-3">
                    <Zap className="w-6 h-6 text-emerald-400" />
                    كفاءة النظام (Performance)
                  </h2>
                  <div className="space-y-6">
                    <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/5">
                      <div className="flex justify-between items-center mb-4">
                        <span className="text-zinc-500 text-sm">استهلاك الذاكرة (Memory)</span>
                        <span className="text-white font-mono font-bold">
                          {stats?.memoryUsage ? (stats.memoryUsage.heapUsed / 1024 / 1024).toFixed(1) : 0} MB
                        </span>
                      </div>
                      <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: stats?.memoryUsage ? `${(stats.memoryUsage.heapUsed / stats.memoryUsage.heapTotal) * 100}%` : 0 }}
                          className="h-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                        />
                      </div>
                    </div>

                    <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/5">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-zinc-500 text-sm">حالة آخر تحديث تلقائي</span>
                        <span className={`text-xs font-black uppercase px-2 py-0.5 rounded-md ${stats && stats.minutesSinceLastScrape > 30 ? 'bg-rose-500/10 text-rose-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                           {stats && stats.minutesSinceLastScrape > 30 ? 'Stale' : 'Active'}
                        </span>
                      </div>
                      <p className="text-xl font-bold text-white mb-2">
                         منذ {stats?.minutesSinceLastScrape || 0} دقيقة
                      </p>
                      <p className="text-xs text-zinc-600 font-mono">
                        {stats?.lastSuccessfulScrape ? format(new Date(stats.lastSuccessfulScrape), "eeee dd MMMM - HH:mm", { locale: ar }) : "---"}
                      </p>
                    </div>
                  </div>
                </section>

                <section className="bg-white/[0.02] border border-white/5 rounded-[2rem] p-8">
                  <h2 className="text-xl font-black mb-8 flex items-center gap-3">
                    <CheckCircle2 className="w-6 h-6 text-blue-400" />
                    بيان حالة القنوات (Scrapers)
                  </h2>
                  <div className="space-y-3">
                    {config.channels.map((ch: any, i: number) => (
                      <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-white/[0.01] border border-white/5 group hover:bg-white/[0.03] transition-all">
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                          <span className="text-sm font-bold text-zinc-300">t.me/s/{ch}</span>
                        </div>
                        <span className="text-[10px] text-zinc-600 font-mono group-hover:text-zinc-400 transition-colors">Monitoring...</span>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            </motion.div>
          )}

          {activeTab === 'logs' && (
            <motion.div 
              key="logs"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <section className="bg-[#0a0a0a] border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl">
                <div className="p-8 border-b border-white/5 flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-black flex items-center gap-3 text-rose-400">
                      <Terminal className="w-6 h-6" />
                      سجلات النظام (Console Logs)
                    </h2>
                    <p className="text-sm text-zinc-500 mt-1">آخر 20 رسالة خطأ أو تحذير من السيرفر والمستخدمين</p>
                  </div>
                  <button 
                    onClick={fetchLogs}
                    className="p-3 rounded-xl bg-white/5 text-zinc-400 hover:text-white transition-all border border-white/5"
                  >
                    <RefreshCw className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="bg-black/40 p-6 font-mono text-sm leading-relaxed max-h-[600px] overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-800">
                  {logs.length === 0 ? (
                    <div className="py-20 text-center flex flex-col items-center gap-4">
                       <Clock className="w-10 h-10 text-zinc-800" />
                       <p className="text-zinc-600">لا توجد سجلات حالياً. النظام يعمل باستقرار.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {logs.map((log, i) => (
                        <div key={i} className="border-b border-white/5 pb-4 last:border-0 hover:bg-white/[0.02] p-4 rounded-2xl transition-all">
                          <div className="flex items-start justify-between mb-2">
                            <span className="text-rose-500 font-black text-xs uppercase px-2 py-0.5 bg-rose-500/10 rounded">Error</span>
                            <span className="text-zinc-600 text-[10px]">{log.created_at ? format(new Date(log.created_at), "yyyy-MM-dd HH:mm:ss") : "---"}</span>
                          </div>
                          <p className="text-zinc-200 font-bold mb-1 selection:bg-rose-500/30">{log.message || "Unknown error"}</p>
                          <div className="flex flex-wrap gap-x-6 gap-y-2 mt-2">
                             <div className="flex flex-col">
                               <span className="text-[10px] text-zinc-600 uppercase">Context</span>
                               <span className="text-[11px] text-emerald-500/70">{log.context || "Backend"}</span>
                             </div>
                             {log.url && (
                               <div className="flex flex-col">
                                  <span className="text-[10px] text-zinc-600 uppercase">URL</span>
                                  <span className="text-[11px] text-blue-500/70 truncate max-w-xs">{log.url}</span>
                               </div>
                             )}
                          </div>
                          {log.stack && (
                             <details className="mt-4 group">
                               <summary className="text-[10px] text-zinc-700 cursor-pointer hover:text-zinc-400 transition-colors uppercase tracking-widest font-black list-none flex items-center gap-2">
                                 <ChevronDown className="w-3 h-3 group-open:rotate-180 transition-transform" />
                                 Show Stack Trace
                               </summary>
                               <pre className="mt-3 p-4 bg-black/60 rounded-xl border border-white/5 text-[10px] text-zinc-500 overflow-x-auto selection:bg-rose-500/20">
                                 {log.stack}
                               </pre>
                             </details>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Floating Status Bar - Bottom */}
      <footer className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] w-fit">
         <div className="bg-black/80 backdrop-blur-2xl border border-white/10 px-6 py-3 rounded-2xl flex items-center gap-6 shadow-2xl">
            <div className="flex items-center gap-2">
               <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]"></div>
               <span className="text-[10px] font-black uppercase text-zinc-400">System Ready</span>
            </div>
            <div className="w-px h-3 bg-zinc-800"></div>
            <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-500">
               <span className="uppercase text-zinc-600">Instance:</span>
               <span className="text-emerald-500/70 font-bold">NODE_PROD_1</span>
            </div>
            <div className="w-px h-3 bg-zinc-800"></div>
             <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-500">
               <span className="uppercase text-zinc-600">Region:</span>
               <span className="text-blue-500/70 font-bold">GER_FRA_01</span>
            </div>
         </div>
      </footer>

      {/* Full-screen success/error messages over overlay */}
      <AnimatePresence>
        {(success || error) && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[110] w-full max-w-md px-6"
          >
            <div className={`p-5 rounded-[2rem] border shadow-2xl backdrop-blur-2xl flex items-center justify-between gap-4 ${
              success 
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
            }`}>
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${success ? 'bg-emerald-500/20' : 'bg-rose-500/20'}`}>
                   {success ? <CheckCircle2 className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
                </div>
                <span className="font-bold text-sm tracking-tight">{success || error}</span>
              </div>
              <button 
                onClick={() => { setSuccess(""); setError(""); }}
                className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
