import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Settings, Save, Plus, Trash2, ArrowRight, ShieldCheck, LogOut, X, Lock,
  Activity, Users, Cpu, History as HistoryIcon, AlertTriangle, Terminal, 
  ArrowLeftRight, ArrowUpRight, ArrowDownRight, CheckCircle2, RefreshCw, Layers, Globe, Zap, Search,
  ChevronDown, ChevronUp, Clock, Info, Building2, Coins, Send, Building, TrendingUp
} from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { logErrorToServer } from "./utils/logger";
import { FlagIcon } from "./components/FlagIcon";
import { TelegramStatus } from "./components/TelegramStatus";

interface Stats {
  onlineUsers: number;
  lastSuccessfulScrape: string;
  minutesSinceLastScrape: number;
  channelsCount: number;
  termsCount: number;
  serverUptime: number;
  serverStartTime: string;
  memoryUsage: { rss: number; heapUsed: number; heapTotal: number };
  dbStats?: {
    parallelRatesCount: number;
    officialRatesCount: number;
    errorLogsCount: number;
    priceChangesCount: number;
  };
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

const RegexEditor = ({ regex, onChange }: { regex: string, onChange: (val: string) => void }) => {
  const [mode, setMode] = useState<'bubbles' | 'raw'>('bubbles');
  const [newWord, setNewWord] = useState('');

  const parsed = useMemo(() => {
    if (!regex.startsWith('(?:')) return null;
    let depth = 0;
    let alternatives = [];
    let currentAlt = '';
    let i = 3;
    for (; i < regex.length; i++) {
      const char = regex[i];
      if (char === '\\') {
        currentAlt += char + (regex[i+1] || '');
        i++;
        continue;
      }
      if (char === '(') depth++;
      if (char === ')') depth--;
      
      if (depth < 0) {
        alternatives.push(currentAlt);
        break;
      }
      
      if (char === '|' && depth === 0) {
        alternatives.push(currentAlt);
        currentAlt = '';
      } else {
        currentAlt += char;
      }
    }
    
    if (depth >= 0) return null;
    
    const suffix = regex.slice(i + 1);
    return { alternatives, suffix };
  }, [regex]);

  useEffect(() => {
    if (!parsed && mode === 'bubbles') {
      setMode('raw');
    }
  }, [parsed, mode]);

  const removeWord = (index: number) => {
    if (!parsed) return;
    const newAlts = [...parsed.alternatives];
    newAlts.splice(index, 1);
    onChange(`(?:${newAlts.join('|')})${parsed.suffix}`);
  };

  const addWord = () => {
    if (!parsed || !newWord.trim()) return;
    const newAlts = [...parsed.alternatives, newWord.trim()];
    onChange(`(?:${newAlts.join('|')})${parsed.suffix}`);
    setNewWord('');
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">محرر REGEX المتقدم</label>
          <Info className="w-4 h-4 text-zinc-700 hover:text-emerald-400 cursor-help" />
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setMode('bubbles')} 
            className={`text-[10px] px-2 py-1 rounded-md transition-colors ${mode === 'bubbles' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/5 text-zinc-400 hover:bg-white/10'}`}
            disabled={!parsed}
          >
            فقاعات
          </button>
          <button 
            onClick={() => setMode('raw')} 
            className={`text-[10px] px-2 py-1 rounded-md transition-colors ${mode === 'raw' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/5 text-zinc-400 hover:bg-white/10'}`}
          >
            نص خام
          </button>
        </div>
      </div>

      {mode === 'bubbles' && parsed ? (
        <div className="bg-black/40 border border-white/10 rounded-xl p-4 flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            {parsed.alternatives.map((alt, i) => (
              <div key={i} className="flex items-center gap-1 bg-white/10 border border-white/10 rounded-lg px-2 py-1 text-xs text-emerald-400 font-mono">
                <span dir="ltr">{alt}</span>
                <button 
                  onClick={() => removeWord(i)}
                  className="w-4 h-4 flex items-center justify-center rounded-full hover:bg-rose-500/20 text-rose-400 transition-colors mr-1"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input 
              type="text" 
              value={newWord}
              onChange={(e) => setNewWord(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addWord()}
              placeholder="إضافة كلمة جديدة..."
              className="flex-1 bg-white/5 border border-white/5 rounded-lg px-3 py-2 text-xs outline-none focus:border-emerald-500/30 text-white font-mono"
              dir="ltr"
            />
            <button 
              onClick={addWord}
              className="px-3 py-2 bg-emerald-500/20 text-emerald-400 rounded-lg text-xs font-bold hover:bg-emerald-500/30 transition-colors"
            >
              إضافة
            </button>
          </div>
        </div>
      ) : (
        <textarea
          value={regex}
          onChange={(e) => onChange(e.target.value)}
          className="w-full h-24 bg-transparent border border-white/10 rounded-xl px-4 py-3 text-xs font-mono text-emerald-400 focus:border-emerald-500/50 outline-none resize-none leading-relaxed"
          dir="ltr"
        />
      )}
    </div>
  );
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
  const [activeTab, setActiveTab] = useState<'config' | 'stats' | 'logs' | 'ai' | 'changes' | 'telegram'>('config');
  const [isAuthorizedDevice, setIsAuthorizedDevice] = useState(true);

  const [expandedTermIdx, setExpandedTermIdx] = useState<number | null>(null);
  const [testTexts, setTestTexts] = useState<Record<number, string>>({});
  const [newKeywords, setNewKeywords] = useState<Record<number, string>>({});
  const [searchPath, setSearchPath] = useState("");
  const [recentChanges, setRecentChanges] = useState<any[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<'online' | 'offline' | 'checking'>('checking');

  // Telegram Auth State
  const [tgPhoneNumber, setTgPhoneNumber] = useState("");
  const [tgApiId, setTgApiId] = useState("");
  const [tgApiHash, setTgApiHash] = useState("");
  const [tgCode, setTgCode] = useState("");
  const [tgPassword, setTgPassword] = useState("");
  const [tgAuthId, setTgAuthId] = useState("");
  const [tgPhoneCodeHash, setTgPhoneCodeHash] = useState("");
  const [tgStep, setTgStep] = useState<'init' | 'code' | 'password'>('init');
  const [tgLoading, setTgLoading] = useState(false);

  const fetchWithTimeout = async (resource: string, options: any = {}, timeout = 8000) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
      const response = await fetch(resource, {
        ...options,
        signal: controller.signal
      });
      clearTimeout(id);
      return response;
    } catch (error) {
      clearTimeout(id);
      throw error;
    }
  };

  const [aiText, setAiText] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [extractedRates, setExtractedRates] = useState<Record<string, number> | null>(null);
  const [currentRates, setCurrentRates] = useState<Record<string, number>>({});

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
      fetchData().catch(() => {});
      const interval = setInterval(() => {
        fetchStats().catch(() => {});
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [token]);

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([fetchConfig(), fetchStats(), fetchLogs(), fetchRecentChanges()]);
    setLoading(false);
  };

  const fetchConfig = async () => {
    try {
      const res = await fetchWithTimeout("/api/admin/config", {
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
      const res = await fetchWithTimeout("/api/admin/stats", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
        setConnectionStatus('online');
      } else {
        if (res.status === 401 || res.status === 403) {
          setToken("");
          try { localStorage.removeItem("adminToken"); } catch (e) {}
        }
        setConnectionStatus('offline');
      }
    } catch (err) {
      // Don't spam server logs for network failures
      if (err instanceof TypeError && err.message === 'Failed to fetch') {
        console.warn("Stats fetch failed: Network error");
      } else {
        console.warn("Stats fetch failed:", err);
        logErrorToServer(err, "Admin.tsx: fetchStats");
      }
      setConnectionStatus('offline');
    }
  };

  const fetchLogs = async () => {
    try {
      const res = await fetchWithTimeout("/api/admin/error-logs", {
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

  const [confirmClearChanges, setConfirmClearChanges] = useState(false);

  const fetchRecentChanges = async () => {
    try {
      const res = await fetchWithTimeout("/api/recent-changes");
      if (res.ok) {
        const data = await res.json();
        setRecentChanges(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.warn("Recent changes fetch failed");
    }
  };

  const handleClearChanges = async () => {
    if (!confirmClearChanges) {
      setConfirmClearChanges(true);
      setTimeout(() => setConfirmClearChanges(false), 3000);
      return;
    }
    try {
      const res = await fetch("/api/admin/recent-changes", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setRecentChanges([]);
        setSuccess("تم تنظيف سجل التغيرات بنجاح");
        setConfirmClearChanges(false);
        setTimeout(() => setSuccess(""), 3000);
      }
    } catch (err) {
      console.error(err);
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
        fetchStats().catch(() => {});
        setTimeout(() => setSuccess(""), 3000);
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError("فشل تحديث البيانات");
    }
    setRefreshing(false);
  };

  const [confirmCleanup, setConfirmCleanup] = useState(false);
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
  const handleCleanup = async () => {
    if (!confirmCleanup) {
      setConfirmCleanup(true);
      setTimeout(() => setConfirmCleanup(false), 3000);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/admin/cleanup", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setSuccess("تم تنظيف البيانات القديمة بنجاح!");
        fetchStats().catch(() => {});
        setConfirmCleanup(false);
        setTimeout(() => setSuccess(""), 3000);
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError("فشل تنظيف البيانات");
    }
    setLoading(false);
  };

  const handleLogout = () => {
    try { localStorage.removeItem("adminToken"); } catch (e) {}
    setToken("");
    setIsLoggedIn(false);
  };

  const fetchCurrentRates = async () => {
    try {
      const res = await fetch("/api/rates");
      if (res.ok) {
        const data = await res.json();
        setCurrentRates(data.parallel || {});
      }
    } catch (err) {
      console.error("Failed to fetch current rates", err);
    }
  };

  const handleAIExtract = async () => {
    if (!aiText.trim()) return;
    setAiLoading(true);
    setError("");
    setSuccess("");
    try {
      await fetchCurrentRates();
      const res = await fetch("/api/admin/extract", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ text: aiText })
      });
      const data = await res.json();
      if (data.success && data.extractedRates) {
        setExtractedRates(data.extractedRates);
        setSuccess("تم استخراج الأسعار بنجاح");
      } else {
        setError(data.message || "فشل استخراج الأسعار");
      }
    } catch (err) {
      setError("خطأ في الاتصال بخادم الاستخراج");
    }
    setAiLoading(false);
  };

  const handleAISave = async () => {
    if (!extractedRates) return;
    setAiLoading(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/admin/rates", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ updates: extractedRates })
      });
      const data = await res.json();
      if (data.success) {
        setSuccess("تم تحديث الأسعار بنجاح");
        setExtractedRates(null);
        setAiText("");
        triggerRefresh();
      } else {
        setError(data.message || "فشل تحديث الأسعار");
      }
    } catch (err) {
      setError("خطأ في الاتصال بالسيرفر");
    }
    setAiLoading(false);
  };

  const handleTgSendCode = async () => {
    setTgLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/telegram/send-code", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ phoneNumber: tgPhoneNumber, apiId: tgApiId, apiHash: tgApiHash })
      });
      const data = await res.json();
      if (data.success) {
        setTgPhoneCodeHash(data.phoneCodeHash);
        setTgAuthId(data.authId);
        setTgStep('code');
        setSuccess("تم إرسال الكود بنجاح");
      } else {
        setError(data.message || "فشل إرسال الكود");
      }
    } catch (err) {
      setError("خطأ في الاتصال بالسيرفر");
    }
    setTgLoading(false);
  };

  const handleTgVerifyCode = async () => {
    setTgLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/telegram/verify-code", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ 
          phoneNumber: tgPhoneNumber, 
          phoneCodeHash: tgPhoneCodeHash, 
          code: tgCode, 
          password: tgPassword,
          authId: tgAuthId
        })
      });
      const data = await res.json();
      if (data.success) {
        // Save the session string to config
        const newConfig = { 
          ...config, 
          telegramApiId: parseInt(tgApiId, 10), 
          telegramApiHash: tgApiHash, 
          telegramSessionString: data.sessionString 
        };
        setConfig(newConfig);
        
        // Save to backend
        const saveRes = await fetch("/api/admin/config", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(newConfig)
        });
        
        if (saveRes.ok) {
          setSuccess("تم ربط حساب تليجرام بنجاح وحفظ الإعدادات");
          setTgStep('init');
          setTgPhoneNumber("");
          setTgCode("");
          setTgPassword("");
        } else {
          setError("تم الربط ولكن فشل حفظ الإعدادات");
        }
      } else {
        if (data.message.includes('2FA')) {
          setTgStep('password');
          setError("مطلوب كلمة مرور التحقق بخطوتين");
        } else {
          setError(data.message || "فشل التحقق من الكود");
        }
      }
    } catch (err) {
      setError("خطأ في الاتصال بالسيرفر");
    }
    setTgLoading(false);
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
      <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4 font-sans selection:bg-emerald-500/30" dir="rtl">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/10 blur-[120px] rounded-full"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full"></div>
        </div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md bg-white/[0.03] backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-8 md:p-10 shadow-2xl relative z-10"
        >
          <div className="flex justify-center mb-8">
            <div className="relative">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-emerald-500 to-blue-600 flex items-center justify-center shadow-2xl shadow-emerald-500/20 rotate-3 hover:rotate-0 transition-transform duration-500">
                <Lock className="w-10 h-10 text-white" />
              </div>
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-emerald-500 rounded-full border-4 border-[#0a0a0a] animate-ping opacity-20"></div>
            </div>
          </div>

          <div className="text-center mb-10">
            <h1 className="text-3xl font-black text-white mb-3 tracking-tight">الدخول الآمن</h1>
            <p className="text-zinc-500 text-sm leading-relaxed">يرجى إدخال مفتاح الوصول الإداري للمتابعة</p>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="relative group">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-5 text-white focus:outline-none focus:border-emerald-500/50 focus:bg-black/60 transition-all text-center text-2xl tracking-[0.3em] font-mono placeholder:tracking-normal placeholder:font-sans placeholder:text-zinc-700"
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
              className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-800 text-black font-black py-5 rounded-2xl transition-all shadow-xl shadow-emerald-500/20 active:scale-[0.98] flex items-center justify-center gap-3 group overflow-hidden relative"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
              {loading ? (
                <RefreshCw className="w-6 h-6 animate-spin" />
              ) : (
                <>
                  <span className="text-lg">فتح لوحة التحكم</span>
                  <Zap className="w-5 h-5 group-hover:fill-current transition-all" />
                </>
              )}
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4 font-sans" dir="rtl">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 text-emerald-500 animate-spin mx-auto mb-4" />
          <p className="text-zinc-500 text-sm">جاري تحميل الإعدادات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col font-sans selection:bg-emerald-500/30" dir="rtl">
      {/* Dynamic Header */}
      <header className="sticky top-0 z-50 bg-[#050505]/95 backdrop-blur-2xl border-b border-white/5 py-4 px-4 md:px-6">
        <div className="max-w-7xl mx-auto space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-blue-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                  <ShieldCheck className="w-5 h-5 md:w-6 md:h-6 text-white" />
                </div>
                <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-[#050505] shadow-sm ${connectionStatus === 'online' ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
              </div>
              <div className="min-w-0">
                <h1 className="text-lg md:text-xl font-black tracking-tight text-white leading-tight">
                  مركز الإدارة <span className="text-emerald-500 text-[10px] bg-emerald-500/10 px-1.5 py-0.5 rounded-full border border-emerald-500/20 ml-1">V4.0</span>
                </h1>
                <div className="flex items-center gap-2 mt-1">
                  <span className="flex items-center gap-1.5 text-zinc-500 text-[10px] md:text-xs">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                    متصل: {uptimeDisplay || "..." }
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
               <TelegramStatus />
               <button
                  onClick={handleLogout}
                  className="p-2.5 rounded-xl bg-white/5 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all border border-white/5"
               >
                 <LogOut className="w-5 h-5" />
               </button>
               <button
                 onClick={handleSave}
                 disabled={loading}
                 className="px-4 md:px-6 py-2.5 rounded-xl bg-white text-black font-black flex items-center gap-2 hover:bg-emerald-400 transition-all active:scale-95 disabled:opacity-50 text-xs md:text-sm shadow-xl shadow-white/5"
               >
                 <Save className="w-4 h-4" />
                 <span className="hidden sm:inline">حفظ النظام</span>
                 <span className="sm:hidden">حفظ</span>
               </button>
            </div>
          </div>

          {/* Quick Real-time Status Chips - Important for Mobile */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/5 rounded-full shrink-0">
               <div className={`w-2 h-2 rounded-full ${stats?.minutesSinceLastScrape && stats.minutesSinceLastScrape < 15 ? 'bg-emerald-500' : 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]'}`}></div>
               <span className="text-[10px] font-bold text-zinc-400">تيليجرام: {stats?.minutesSinceLastScrape ? `منذ ${stats.minutesSinceLastScrape}د` : '---'}</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/5 rounded-full shrink-0">
               <div className="w-2 h-2 rounded-full bg-blue-500"></div>
               <span className="text-[10px] font-bold text-zinc-400">المستخدمين: {stats?.onlineUsers || 0}</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/5 rounded-full shrink-0">
               <div className="w-2 h-2 rounded-full bg-purple-500"></div>
               <span className="text-[10px] font-bold text-zinc-400">الرام: {stats?.memoryUsage ? `${Math.round(stats.memoryUsage.heapUsed / 1024 / 1024)}mb` : '---'}</span>
            </div>
          </div>

          {/* Navigation Bar */}
          <nav className="flex items-center gap-1 bg-white/[0.03] p-1 rounded-2xl border border-white/5 overflow-x-auto scrollbar-hide">
            {[
              { id: 'config', label: 'الإعدادات', icon: Settings },
              { id: 'stats', label: 'النشاط', icon: Activity },
              { id: 'changes', label: 'السجل', icon: HistoryIcon },
              { id: 'ai', label: 'قارئ نصوص', icon: Zap },
              { id: 'telegram', label: 'الحساب', icon: Globe },
              { id: 'logs', label: 'الأخطاء', icon: AlertTriangle },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 md:px-5 py-2 md:py-2.5 rounded-xl text-[11px] md:text-xs font-black transition-all whitespace-nowrap shrink-0 group ${
                  activeTab === tab.id 
                    ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20' 
                    : 'text-zinc-500 hover:text-white hover:bg-white/5'
                }`}
              >
                <tab.icon className={`w-3.5 h-3.5 md:w-4 md:h-4 ${activeTab === tab.id ? 'stroke-[3]' : 'group-hover:scale-110 transition-transform'}`} />
                {tab.label}
              </button>
            ))}
          </nav>
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
              className="space-y-6 md:space-y-8 pb-24"
            >
              {/* Data Sources Section */}
              <section className="bg-white/[0.02] border border-white/5 rounded-[2rem] p-6 md:p-8">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-lg md:text-xl font-black flex items-center gap-3 text-blue-400">
                    <Globe className="w-5 h-5 md:w-6 md:h-6" />
                    مصادر البيانات (Data Sources)
                  </h2>
                  <button 
                    onClick={() => setConfig({...config, channels: [...config.channels, '']})}
                    className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-all flex items-center justify-center"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {config.channels.map((ch: string, i: number) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-2xl bg-white/[0.03] border border-white/5 group hover:bg-white/[0.05] transition-all">
                      <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 shrink-0">
                        <Send className="w-5 h-5" />
                      </div>
                      <input 
                        value={ch}
                        onChange={(e) => {
                          const newChannels = [...config.channels];
                          newChannels[i] = e.target.value;
                          setConfig({...config, channels: newChannels});
                        }}
                        placeholder="اسم القناة (بدون @)"
                        className="flex-1 bg-transparent border-none focus:ring-0 text-white font-bold text-sm"
                        dir="ltr"
                      />
                      <button 
                        onClick={() => {
                          const newChannels = config.channels.filter((_: any, idx: number) => idx !== i);
                          setConfig({...config, channels: newChannels});
                        }}
                        className="p-2 text-zinc-600 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="mt-6 flex items-center justify-between p-4 rounded-2xl bg-white/[0.03] border border-white/5">
                  <span className="text-sm font-bold text-zinc-400">تفعيل الكاشط التقليدي (احتياطي)</span>
                  <button 
                    onClick={() => setConfig({...config, enableHttpScraper: !config.enableHttpScraper})}
                    className={`w-14 h-8 rounded-full transition-colors ${config.enableHttpScraper ? 'bg-emerald-500' : 'bg-zinc-700'}`}
                  >
                    <div className={`w-6 h-6 rounded-full bg-white transition-transform ${config.enableHttpScraper ? 'translate-x-7' : 'translate-x-1'}`} />
                  </button>
                </div>
              </section>

              {/* Intelligent Recognition System */}
              <section className="bg-white/[0.02] border border-white/5 rounded-[2rem] p-6 md:p-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                  <div>
                    <h2 className="text-lg md:text-xl font-black flex items-center gap-3 text-emerald-400">
                      <Zap className="w-5 h-5 md:w-6 md:h-6" />
                      نظام التعرف الذكي (Smart Extraction)
                    </h2>
                    <p className="text-zinc-500 text-xs mt-1 font-medium">تحديد القواعد والكلمات المفتاحية لاستخراج الأسعار آلياً</p>
                  </div>
                  <button 
                    onClick={() => setConfig({
                      ...config,
                      terms: [...config.terms, { id: "NEW", name: "عملة جديدة", regex: "(?:كلمة|أخرى)\\s*[=:]?\\s*(\\d{1,2}(?:[\\.,]\\d+)?)", min: 0.1, max: 100, isInverse: false, flag: "" }]
                    })}
                    className="flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-emerald-500 text-black hover:bg-emerald-400 transition-all font-black text-sm shadow-lg shadow-emerald-500/20"
                  >
                    <Plus className="w-4 h-4" />
                    إضافة عملة جديدة
                  </button>
                </div>

                {/* Search bar */}
                <div className="relative mb-8 group">
                  <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-600 group-focus-within:text-emerald-400 transition-colors" />
                  <input 
                    type="text" 
                    placeholder="ابحث عن عملة أو معرف..."
                    value={searchPath}
                    onChange={(e) => setSearchPath(e.target.value)}
                    className="w-full bg-white/[0.03] border border-white/10 rounded-2xl pr-12 pl-4 py-4 text-sm focus:outline-none focus:border-emerald-500/50 transition-all focus:bg-white/5"
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
                          isExpanded ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-white/5 bg-white/[0.01] hover:bg-white/[0.03]'
                        }`}
                      >
                        <div 
                          className="flex items-center justify-between p-5 cursor-pointer select-none"
                          onClick={() => setExpandedTermIdx(isExpanded ? null : idx)}
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 overflow-hidden">
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
                                          className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-mono focus:border-emerald-500/50 outline-none text-white"
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
                                          className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:border-emerald-500/50 text-white"
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
                                          className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-center font-mono outline-none text-white"
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
                                          className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-center font-mono outline-none text-white"
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
                                          className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-mono outline-none text-white"
                                          dir="ltr"
                                        />
                                        <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden">
                                          <FlagIcon flagCode={term.flag} name="flag" className="w-6 h-6" fallbackType="coins" />
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="space-y-6 flex flex-col">
                                    <div className="bg-black/40 border border-white/5 rounded-2xl p-4 flex-1">
                                      <RegexEditor 
                                        regex={term.regex} 
                                        onChange={(val) => {
                                          const newTerms = [...config.terms];
                                          newTerms[idx].regex = val;
                                          setConfig({ ...config, terms: newTerms });
                                        }} 
                                      />
                                      
                                      <div className="mt-6 flex flex-col gap-3">
                                        <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">تجربة فورية</label>
                                        <input
                                          type="text"
                                          placeholder="أدخل نصًا للتجربة..."
                                          value={testText}
                                          onChange={(e) => setTestTexts({ ...testTexts, [idx]: e.target.value })}
                                          className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-xs outline-none focus:border-emerald-500/30 text-white"
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
              <div className="sticky bottom-4 z-40">
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="w-full py-4 rounded-2xl bg-emerald-500 text-black font-black flex items-center justify-center gap-2 hover:bg-emerald-400 transition-all active:scale-95 shadow-xl shadow-emerald-500/20 disabled:opacity-50"
                >
                  <Save className="w-5 h-5" />
                  <span>حفظ جميع التغييرات</span>
                </button>
              </div>
            </motion.div>
          )}

          {activeTab === 'stats' && (
            <motion.div 
              key="stats"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6 md:space-y-8"
            >
              {/* Quick Actions Control Center - Perfect for Mobile */}
              <section className="bg-white/[0.03] border border-white/10 rounded-[2rem] p-6 shadow-2xl">
                <h3 className="text-sm font-black text-zinc-500 uppercase tracking-widest mb-6 px-1">التحكم السريع بالسيرفر</h3>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                   <button 
                     onClick={triggerRefresh}
                     disabled={refreshing}
                     className="flex flex-col items-center justify-center p-4 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500 transition-all group active:scale-95"
                   >
                     <RefreshCw className={`w-6 h-6 text-emerald-400 group-hover:text-black mb-2 ${refreshing ? 'animate-spin' : ''}`} />
                     <span className="text-[11px] font-black text-white group-hover:text-black">تحديث السوق</span>
                   </button>
                   <button 
                     onClick={async () => {
                        setLoading(true);
                        try {
                           const res = await fetch(`/api/refresh-official?key=${config.cronSecret || 'Lyd@2026!SecureCronRefreshKey_99xZ'}`);
                           if(res.ok) setSuccess("تم تحديث السعر الرسمي");
                        } catch(e) {}
                        setLoading(false);
                     }}
                     className="flex flex-col items-center justify-center p-4 rounded-3xl bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500 transition-all group active:scale-95"
                   >
                     <Building2 className="w-6 h-6 text-blue-400 group-hover:text-black mb-2" />
                     <span className="text-[11px] font-black text-white group-hover:text-black">تحديث الرسمي</span>
                   </button>
                   <button 
                     onClick={handleCleanup}
                     className="flex flex-col items-center justify-center p-4 rounded-3xl bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500 transition-all group active:scale-95"
                   >
                     <Trash2 className="w-6 h-6 text-rose-400 group-hover:text-black mb-2" />
                     <span className="text-[11px] font-black text-white group-hover:text-black">تنظيف الداتا</span>
                   </button>
                   <button 
                     onClick={() => window.open('https://dollar-price-qp14.onrender.com', '_blank')}
                     className="flex flex-col items-center justify-center p-4 rounded-3xl bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500 transition-all group active:scale-95"
                   >
                     <Globe className="w-6 h-6 text-amber-400 group-hover:text-black mb-2" />
                     <span className="text-[11px] font-black text-white group-hover:text-black">عرض الموقع</span>
                   </button>
                </div>
              </section>

              {/* Server Status Hero Card */}
              <div className="bg-gradient-to-br from-emerald-500/10 to-blue-600/10 border border-white/10 rounded-[2rem] p-6 md:p-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 blur-[100px] rounded-full -mr-32 -mt-32"></div>
                <div className="relative flex flex-col md:items-center lg:flex-row justify-between gap-6">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-white/5 flex items-center justify-center text-emerald-400 border border-white/10 shadow-xl">
                      <Cpu className="w-7 h-7 md:w-8 md:h-8" />
                    </div>
                    <div>
                      <h2 className="text-lg md:text-2xl font-black text-white mb-1">صحة النظام (Engine Status)</h2>
                      <p className="text-zinc-500 text-[10px] md:text-sm flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        سيرفر Render نشط ويعمل بكفاءة عالية
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-start lg:items-end gap-1 bg-black/20 p-4 rounded-2xl border border-white/5 w-full lg:w-auto">
                    <span className="text-zinc-500 text-[9px] uppercase tracking-widest font-black">وقت التشغيل المتواصل</span>
                    <span className="text-xl md:text-3xl font-black text-white font-mono tracking-tighter tabular-nums">{uptimeDisplay || "..."}</span>
                    <div className="flex items-center gap-2 mt-1">
                       <Clock className="w-3 h-3 text-zinc-600" />
                       <span className="text-zinc-600 text-[9px] font-mono">آخر ريستارت: {stats?.serverStartTime ? format(new Date(stats.serverStartTime), "yyyy/MM/dd HH:mm", { locale: ar }) : "---"}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                {[
                  { label: "زوار الآن", value: stats?.onlineUsers || 0, icon: Users, color: "emerald" },
                  { label: "المصادر", value: stats?.channelsCount || 0, icon: Globe, color: "blue" },
                  { label: "الأصول", value: stats?.termsCount || 0, icon: Layers, color: "purple" },
                  { label: "الذاكرة", value: stats?.memoryUsage ? (stats.memoryUsage.heapUsed / 1024 / 1024).toFixed(0) + "MB" : "---", icon: Zap, color: "amber" }
                ].map((stat, i) => (
                  <div key={i} className="bg-white/[0.02] border border-white/5 rounded-[2rem] p-6 relative overflow-hidden group hover:bg-white/[0.04] transition-all">
                    <div className="flex items-center justify-between mb-4">
                      <div className={`w-10 h-10 rounded-xl bg-${stat.color}-500/10 flex items-center justify-center text-${stat.color}-400 border border-${stat.color}-500/20 shadow-lg`}>
                        <stat.icon className="w-5 h-5" />
                      </div>
                      <div className={`w-1.5 h-1.5 rounded-full bg-${stat.color}-500 animate-pulse`}></div>
                    </div>
                    <p className="text-zinc-500 text-[11px] font-black uppercase tracking-wider mb-1">{stat.label}</p>
                    <h3 className="text-2xl md:text-3xl font-black text-white font-mono">{stat.value}</h3>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
                <section className="bg-white/[0.02] border border-white/5 rounded-[2rem] p-6 md:p-8">
                  <h2 className="text-lg md:text-xl font-black mb-6 md:mb-8 flex items-center gap-3">
                    <Zap className="w-5 h-5 md:w-6 md:h-6 text-emerald-400" />
                    كفاءة النظام (Performance)
                  </h2>
                  <div className="space-y-6">
                    <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/5">
                      <div className="flex justify-between items-center mb-4">
                        <span className="text-zinc-500 text-xs md:text-sm">استهلاك الذاكرة (Memory)</span>
                        <span className="text-white text-xs md:text-sm font-mono font-bold">
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

                    <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/5">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-zinc-500 text-xs md:text-sm">حالة آخر تحديث تلقائي</span>
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${stats && stats.minutesSinceLastScrape > 30 ? 'bg-rose-500/10 text-rose-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                           {stats && stats.minutesSinceLastScrape > 30 ? 'Stale' : 'Active'}
                        </span>
                      </div>
                      <p className="text-lg md:text-xl font-bold text-white mb-2">
                         منذ {stats?.minutesSinceLastScrape || 0} دقيقة
                      </p>
                      <p className="text-[10px] md:text-xs text-zinc-600 font-mono">
                        {stats?.lastSuccessfulScrape ? format(new Date(stats.lastSuccessfulScrape), "eeee dd MMMM - HH:mm", { locale: ar }) : "---"}
                      </p>
                    </div>
                  </div>
                </section>

                {/* Database Stats */}
                {stats?.dbStats && (
                  <section className="bg-[#0a0a0a] border border-white/10 rounded-[2.5rem] p-6 md:p-8 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[80px] rounded-full pointer-events-none"></div>
                    <div className="relative">
                      <h2 className="text-lg md:text-xl font-black flex items-center gap-3 text-white mb-6 md:mb-8">
                        <Layers className="w-5 h-5 md:w-6 md:h-6 text-emerald-400" />
                        إحصائيات قاعدة البيانات
                      </h2>
                      
                      <div className="grid grid-cols-2 gap-4 md:gap-6">
                        <div className="bg-white/[0.02] border border-white/5 p-4 md:p-6 rounded-3xl">
                          <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-black mb-2">سجلات الأسعار</p>
                          <p className="text-xl md:text-2xl font-black text-white font-mono">{stats.dbStats.parallelRatesCount.toLocaleString()}</p>
                        </div>
                        <div className="bg-white/[0.02] border border-white/5 p-4 md:p-6 rounded-3xl">
                          <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-black mb-2">السعر الرسمي</p>
                          <p className="text-xl md:text-2xl font-black text-white font-mono">{stats.dbStats.officialRatesCount.toLocaleString()}</p>
                        </div>
                        <div className="bg-white/[0.02] border border-white/5 p-4 md:p-6 rounded-3xl">
                          <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-black mb-2">سجل التغيرات</p>
                          <p className="text-xl md:text-2xl font-black text-blue-400 font-mono">{stats.dbStats.priceChangesCount.toLocaleString()}</p>
                        </div>
                        <div className="bg-white/[0.02] border border-white/5 p-4 md:p-6 rounded-3xl">
                          <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-black mb-2">سجلات الأخطاء</p>
                          <p className="text-xl md:text-2xl font-black text-rose-400 font-mono">{stats.dbStats.errorLogsCount.toLocaleString()}</p>
                        </div>
                      </div>

                      <div className="mt-6 md:mt-8 pt-6 md:pt-8 border-t border-white/5">
                        <button 
                          onClick={handleCleanup}
                          disabled={loading}
                          className={`w-full py-3 md:py-4 rounded-2xl font-black flex items-center justify-center gap-2 transition-all text-xs md:text-sm ${
                            confirmCleanup 
                              ? 'bg-rose-500 text-black shadow-lg shadow-rose-500/20' 
                              : 'bg-white/5 text-zinc-400 hover:text-white border border-white/5'
                          }`}
                        >
                          <Trash2 className="w-4 h-4 md:w-5 h-5" />
                          {confirmCleanup ? 'تأكيد تنظيف البيانات؟' : 'تنظيف البيانات القديمة'}
                        </button>
                      </div>
                    </div>
                  </section>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'changes' && (
            <motion.div 
              key="changes"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <section className="bg-[#0a0a0a] border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl">
                <div className="p-8 border-b border-white/5 flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-black flex items-center gap-3 text-blue-400">
                      <HistoryIcon className="w-6 h-6" />
                      سجل التغيرات
                    </h2>
                    <p className="text-sm text-zinc-500 mt-1">يعرض أحدث التغيرات في الأسعار مع ذكر المصادر</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={handleClearChanges}
                      className={`px-4 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2 text-sm ${
                        confirmClearChanges 
                          ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20' 
                          : 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/10'
                      }`}
                    >
                      <Trash2 className="w-4 h-4" />
                      {confirmClearChanges ? 'تأكيد المسح؟' : 'تنظيف السجل'}
                    </button>
                    <button 
                      onClick={fetchRecentChanges}
                      className="p-3 rounded-xl bg-white/5 text-zinc-400 hover:text-white transition-all border border-white/5"
                    >
                      <RefreshCw className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                
                <div className="bg-black/40 p-6 max-h-[600px] overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-800">
                  {recentChanges.length === 0 ? (
                    <div className="py-20 text-center flex flex-col items-center gap-4">
                       <HistoryIcon className="w-10 h-10 text-zinc-800" />
                       <p className="text-zinc-600">لا توجد تغيرات مسجلة حالياً.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {recentChanges.map((change, i) => (
                        <div key={change.id || i} className="border border-white/5 bg-white/[0.02] p-5 rounded-2xl hover:bg-white/[0.04] transition-all flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20 shrink-0">
                              <TrendingUp className="w-6 h-6 text-blue-400" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-white font-bold text-lg">{change.currencyName}</span>
                                <span className="text-xs font-mono px-2 py-0.5 bg-white/10 rounded-md text-zinc-400">{change.currencyCode}</span>
                              </div>
                              <div className="flex items-center gap-2 text-sm">
                                <span className="text-zinc-500 line-through">{change.oldPrice}</span>
                                <ArrowLeftRight className="w-3 h-3 text-zinc-600" />
                                <span className={`font-black ${change.newPrice > change.oldPrice ? 'text-emerald-400' : 'text-rose-400'}`}>
                                  {change.newPrice}
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex flex-col md:items-end gap-2 border-t md:border-t-0 md:border-r border-white/5 pt-4 md:pt-0 md:pr-6">
                            <div className="flex items-center gap-2 text-xs text-zinc-400 bg-black/40 px-3 py-1.5 rounded-lg border border-white/5">
                              <Globe className="w-3 h-3 text-blue-400" />
                              <span className="truncate max-w-[150px] md:max-w-[200px]" dir="ltr">{change.source}</span>
                            </div>
                            <div className="flex items-center gap-1 text-[11px] text-zinc-500 font-mono">
                              <Clock className="w-3 h-3" />
                              {format(new Date(change.timestamp), "yyyy-MM-dd HH:mm:ss")}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>
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

          {activeTab === 'ai' && (
            <motion.div 
              key="ai"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Header */}
              <section className="bg-white/[0.02] border border-white/5 rounded-[2rem] p-6 md:p-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 blur-[100px] rounded-full pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/5 blur-[80px] rounded-full pointer-events-none"></div>
                
                <div className="flex flex-col md:flex-row items-start md:items-center gap-6 mb-8 relative">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-blue-500/20 flex items-center justify-center border border-emerald-500/20 shrink-0">
                    <Zap className="w-8 h-8 text-emerald-400" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-2xl font-black text-white mb-1">استخراج الأسعار من النصوص</h2>
                    <p className="text-sm text-zinc-500 leading-relaxed">
                      الصق رسالة السوق هنا، وسيقوم النظام بقراءة وتحليل جميع الأسعار تلقائياً واستخراج <span className="text-emerald-400 font-bold">سعر البيع</span> (الرقم الثاني) لكل عملة.
                    </p>
                  </div>
                </div>

                {/* Input Area */}
                <div className="relative">
                  <textarea
                    value={aiText}
                    onChange={(e) => setAiText(e.target.value)}
                    placeholder={`الصق رسالة السوق هنا... مثال:\nUSD دولار 10.2800 10.2775 down\njbank صكوك الجمهورية 11.1800 11.1775 fixed\nدينار حوالة دبي 10.1700 10.1675 down`}
                    className="w-full h-48 bg-black/40 border border-white/10 rounded-2xl p-5 text-sm text-white focus:outline-none focus:border-emerald-500/40 focus:ring-1 focus:ring-emerald-500/20 transition-all resize-none font-mono leading-relaxed placeholder:text-zinc-700 placeholder:font-sans"
                    dir="auto"
                  />
                  {aiText && (
                    <button
                      onClick={() => { setAiText(''); setExtractedRates(null); }}
                      className="absolute top-3 left-3 w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 transition-all flex items-center justify-center text-zinc-500 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Extract Button */}
                <button
                  onClick={handleAIExtract}
                  disabled={aiLoading || !aiText.trim()}
                  className="w-full mt-4 py-4 rounded-2xl bg-gradient-to-l from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 disabled:from-zinc-800 disabled:to-zinc-800 disabled:text-zinc-600 text-black font-black transition-all flex items-center justify-center gap-3 shadow-lg shadow-emerald-900/30 disabled:shadow-none active:scale-[0.98]"
                >
                  {aiLoading && !extractedRates ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      <span>جاري التحليل والاستخراج...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-5 h-5" />
                      <span>استخراج الأسعار ذكياً</span>
                    </>
                  )}
                </button>
              </section>

              {/* Results Table */}
              <AnimatePresence>
                {extractedRates && Object.keys(extractedRates).length > 0 && (
                  <motion.section
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="bg-white/[0.02] border border-white/5 rounded-[2rem] overflow-hidden"
                  >
                    {/* Table Header */}
                    <div className="p-6 border-b border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-black text-white flex items-center gap-3">
                          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                          الأسعار المستخرجة
                          <span className="text-xs font-mono bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20">
                            {Object.keys(extractedRates).length} عملة
                          </span>
                        </h3>
                        <p className="text-xs text-zinc-600 mt-1">راجع الأسعار وقم بتعديل أي قيمة، ثم اضغط موافقة لحفظها</p>
                      </div>
                      
                      {/* Select All */}
                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-2 cursor-pointer text-sm text-zinc-400 hover:text-white transition-colors">
                          <input
                            type="checkbox"
                            className="w-4 h-4 rounded accent-emerald-500"
                            checked={Object.keys(extractedRates).every(k => !(extractedRates as any)[`_skip_${k}`])}
                            onChange={(e) => {
                              const newRates = { ...extractedRates };
                              Object.keys(extractedRates).forEach(k => {
                                if (!e.target.checked) (newRates as any)[`_skip_${k}`] = true;
                                else delete (newRates as any)[`_skip_${k}`];
                              });
                              setExtractedRates(newRates);
                            }}
                          />
                          تحديد الكل
                        </label>
                      </div>
                    </div>

                    {/* Comparison Table */}
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-white/5 text-[10px] text-zinc-600 font-black uppercase tracking-widest">
                            <th className="p-4 text-right">✓</th>
                            <th className="p-4 text-right">العملة</th>
                            <th className="p-4 text-center">السعر الحالي (ق.البيانات)</th>
                            <th className="p-4 text-center">سعر البيع الجديد ✏️</th>
                            <th className="p-4 text-center">التغيير</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.03]">
                          {Object.entries(extractedRates)
                            .filter(([k]) => !k.startsWith('_'))
                            .map(([key, newValue]) => {
                              const currentVal = currentRates[key] || 0;
                              const diff = (newValue as number) - currentVal;
                              const diffPct = currentVal > 0 ? ((diff / currentVal) * 100) : 0;
                              const isUp = diff > 0.001;
                              const isDown = diff < -0.001;
                              const isSkipped = !!(extractedRates as any)[`_skip_${key}`];
                              const term = config?.terms?.find((t: any) => t.id === key);

                              return (
                                <tr
                                  key={key}
                                  className={`transition-all ${isSkipped ? 'opacity-40' : 'hover:bg-white/[0.02]'}`}
                                >
                                  {/* Checkbox */}
                                  <td className="p-4">
                                    <input
                                      type="checkbox"
                                      className="w-4 h-4 rounded accent-emerald-500 cursor-pointer"
                                      checked={!isSkipped}
                                      onChange={(e) => {
                                        const newRates = { ...extractedRates };
                                        if (!e.target.checked) (newRates as any)[`_skip_${key}`] = true;
                                        else delete (newRates as any)[`_skip_${key}`];
                                        setExtractedRates(newRates);
                                      }}
                                    />
                                  </td>

                                  {/* Currency Info */}
                                  <td className="p-4">
                                    <div className="flex items-center gap-3">
                                      <div className="w-9 h-9 rounded-xl overflow-hidden border border-white/10 shrink-0">
                                        <FlagIcon flagCode={term?.flag} name={term?.name || key} className="w-9 h-9" fallbackType="coins" />
                                      </div>
                                      <div>
                                        <p className="text-sm font-bold text-white">{term?.name || key}</p>
                                        <p className="text-[10px] font-mono text-zinc-600 uppercase">{key}</p>
                                      </div>
                                    </div>
                                  </td>

                                  {/* Current Price */}
                                  <td className="p-4 text-center">
                                    <span className="font-mono text-zinc-400 text-sm">
                                      {currentVal > 0 ? currentVal.toFixed(4) : <span className="text-zinc-700">—</span>}
                                    </span>
                                  </td>

                                  {/* New Price - Editable */}
                                  <td className="p-4 text-center">
                                    <input
                                      type="number"
                                      step="0.0001"
                                      value={newValue as number}
                                      disabled={isSkipped}
                                      onChange={(e) => {
                                        const v = parseFloat(e.target.value);
                                        if (!isNaN(v)) setExtractedRates({ ...extractedRates, [key]: v });
                                      }}
                                      className="w-28 bg-emerald-500/5 border border-emerald-500/20 rounded-xl px-3 py-2 text-sm text-center font-mono text-emerald-400 font-bold focus:outline-none focus:border-emerald-500/50 focus:bg-emerald-500/10 transition-all disabled:opacity-40"
                                      dir="ltr"
                                    />
                                  </td>

                                  {/* Change Indicator */}
                                  <td className="p-4 text-center">
                                    {currentVal > 0 ? (
                                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black ${
                                        isUp ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                        isDown ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                                        'bg-zinc-800 text-zinc-500 border border-white/5'
                                      }`}>
                                        {isUp && <ArrowUpRight className="w-3 h-3" />}
                                        {isDown && <ArrowDownRight className="w-3 h-3" />}
                                        {!isUp && !isDown && '—'}
                                        {(isUp || isDown) && `${Math.abs(diffPct).toFixed(2)}%`}
                                      </span>
                                    ) : (
                                      <span className="text-xs text-zinc-700 font-mono">جديد</span>
                                    )}
                                  </td>
                                </tr>
                              );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Approve & Save Button */}
                    <div className="p-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
                      <p className="text-xs text-zinc-600">
                        سيتم حفظ <span className="text-white font-bold">{Object.keys(extractedRates).filter(k => !k.startsWith('_skip_') && !(extractedRates as any)[`_skip_${k}`] && !k.startsWith('_')).length}</span> أسعار في قاعدة البيانات
                      </p>
                      <button
                        onClick={() => {
                          // Build updates from non-skipped items only
                          const updates: Record<string, number> = {};
                          Object.entries(extractedRates).forEach(([k, v]) => {
                            if (!k.startsWith('_') && !(extractedRates as any)[`_skip_${k}`]) {
                              updates[k] = v as number;
                            }
                          });
                          // Temporarily override extractedRates for the save function
                          const savedRates = extractedRates;
                          setExtractedRates(updates);
                          setTimeout(() => handleAISave(), 50);
                          setTimeout(() => { if (Object.keys(updates).length === 0) setExtractedRates(savedRates); }, 100);
                        }}
                        disabled={aiLoading || Object.keys(extractedRates).filter(k => !k.startsWith('_') && !(extractedRates as any)[`_skip_${k}`]).length === 0}
                        className="px-8 py-4 rounded-2xl bg-white text-black font-black flex items-center gap-3 hover:bg-emerald-400 transition-all active:scale-95 disabled:opacity-40 disabled:hover:bg-white shadow-xl"
                      >
                        {aiLoading && extractedRates ? (
                          <RefreshCw className="w-5 h-5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-5 h-5" />
                        )}
                        موافقة وحفظ الأسعار
                      </button>
                    </div>
                  </motion.section>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {activeTab === 'telegram' && (
            <motion.div 
              key="telegram"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <section className="bg-white/[0.02] border border-white/5 rounded-[2rem] p-6 md:p-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/5 blur-[100px] rounded-full pointer-events-none"></div>
                
                <div className="flex flex-col md:flex-row items-start md:items-center gap-6 mb-8 relative">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center border border-blue-500/20 shrink-0">
                    <Globe className="w-8 h-8 text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-2xl font-black text-white mb-1">ربط حساب تليجرام (MTProto)</h2>
                    <p className="text-sm text-zinc-500 leading-relaxed">
                      قم بربط حساب تليجرام الخاص بك لتجاوز حظر الكاشط (Anti-bot) وجلب الأسعار بسرعة وموثوقية عالية.
                    </p>
                  </div>
                </div>

                {config?.telegramSessionString ? (
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
                        <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-emerald-400">الحساب متصل بنجاح</h3>
                        <p className="text-sm text-emerald-500/70">يتم الآن جلب البيانات عبر MTProto</p>
                      </div>
                    </div>
                    <button
                      onClick={async () => {
                        if (window.confirm("هل أنت متأكد من إلغاء ربط الحساب؟")) {
                          try {
                            const newConfig = { ...config, telegramSessionString: "" };
                            setConfig(newConfig);
                            await fetch("/api/admin/config", {
                              method: "POST",
                              headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                              body: JSON.stringify(newConfig)
                            });
                            setSuccess("تم إلغاء ربط الحساب");
                          } catch (err) {
                            console.error("Failed to unbind account:", err);
                            setError("فشل إلغاء ربط الحساب");
                          }
                        }
                      }}
                      className="px-4 py-2 rounded-xl bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-colors font-bold text-sm"
                    >
                      إلغاء الربط
                    </button>
                  </div>
                ) : (
                  <div className="max-w-xl mx-auto space-y-6">
                    {tgStep === 'init' && (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-bold text-zinc-400 mb-2">API ID</label>
                          <input
                            type="text"
                            value={tgApiId}
                            onChange={(e) => setTgApiId(e.target.value)}
                            placeholder="مثال: 1234567"
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500/50"
                            dir="ltr"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-zinc-400 mb-2">API Hash</label>
                          <input
                            type="text"
                            value={tgApiHash}
                            onChange={(e) => setTgApiHash(e.target.value)}
                            placeholder="مثال: 0123456789abcdef0123456789abcdef"
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500/50"
                            dir="ltr"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-zinc-400 mb-2">رقم الهاتف (مع رمز الدولة)</label>
                          <input
                            type="text"
                            value={tgPhoneNumber}
                            onChange={(e) => setTgPhoneNumber(e.target.value)}
                            placeholder="مثال: +218912345678"
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500/50"
                            dir="ltr"
                          />
                        </div>
                        <button
                          onClick={handleTgSendCode}
                          disabled={tgLoading || !tgPhoneNumber || !tgApiId || !tgApiHash}
                          className="w-full py-4 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 text-white font-bold transition-all flex items-center justify-center gap-2 mt-4"
                        >
                          {tgLoading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                          إرسال كود التحقق
                        </button>
                      </div>
                    )}

                    {tgStep === 'code' && (
                      <div className="space-y-4">
                        <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl mb-4 text-sm text-blue-400">
                          تم إرسال كود التحقق إلى تطبيق تليجرام الخاص بك ({tgPhoneNumber}).
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-zinc-400 mb-2">كود التحقق</label>
                          <input
                            type="text"
                            value={tgCode}
                            onChange={(e) => setTgCode(e.target.value)}
                            placeholder="أدخل الكود المكون من 5 أرقام"
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500/50 text-center tracking-[0.5em] font-mono text-lg"
                            dir="ltr"
                          />
                        </div>
                        <div className="flex gap-3 mt-4">
                          <button
                            onClick={() => setTgStep('init')}
                            className="px-6 py-4 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold transition-all"
                          >
                            رجوع
                          </button>
                          <button
                            onClick={handleTgVerifyCode}
                            disabled={tgLoading || !tgCode}
                            className="flex-1 py-4 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 text-white font-bold transition-all flex items-center justify-center gap-2"
                          >
                            {tgLoading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                            تأكيد الكود
                          </button>
                        </div>
                      </div>
                    )}

                    {tgStep === 'password' && (
                      <div className="space-y-4">
                        <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl mb-4 text-sm text-amber-400">
                          هذا الحساب محمي بكلمة مرور التحقق بخطوتين (2FA). يرجى إدخالها للمتابعة.
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-zinc-400 mb-2">كلمة المرور (2FA)</label>
                          <input
                            type="password"
                            value={tgPassword}
                            onChange={(e) => setTgPassword(e.target.value)}
                            placeholder="أدخل كلمة المرور"
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500/50"
                            dir="ltr"
                          />
                        </div>
                        <div className="flex gap-3 mt-4">
                          <button
                            onClick={() => setTgStep('init')}
                            className="px-6 py-4 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold transition-all"
                          >
                            إلغاء
                          </button>
                          <button
                            onClick={handleTgVerifyCode}
                            disabled={tgLoading || !tgPassword}
                            className="flex-1 py-4 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 text-white font-bold transition-all flex items-center justify-center gap-2"
                          >
                            {tgLoading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                            تسجيل الدخول
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
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
