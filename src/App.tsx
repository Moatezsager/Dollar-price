import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowDownRight,
  ArrowUpRight,
  RefreshCw,
  Activity,
  Building2,
  Coins,
  Clock,
  Bell
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

interface Rates {
  official: Record<string, number>;
  parallel: Record<string, number>;
  previousOfficial?: Record<string, number>;
  previousParallel?: Record<string, number>;
  lastUpdated: string;
}

interface HistoryPoint {
  time: string;
  usdParallel: number;
  usdOfficial: number;
  ratesParallel?: Record<string, number>;
  ratesOfficial?: Record<string, number>;
}

const CURRENCIES = [
  { code: "USD", name: "دولار أمريكي", flag: "us" },
  { code: "EUR", name: "يورو", flag: "eu" },
  { code: "GBP", name: "جنيه إسترليني", flag: "gb" },
  { code: "TND", name: "دينار تونسي", flag: "tn" },
  { code: "TRY", name: "ليرة تركية", flag: "tr" },
  { code: "EGP", name: "جنيه مصري", flag: "eg" },
];

const PARALLEL_DETAILS = [
  { code: "USD_TR", name: "حوالات تركيا", flag: "tr", unit: "د.ل" },
  { code: "USD_AE", name: "حوالات دبي", flag: "ae", unit: "د.ل" },
  { code: "GOLD", name: "كسر الذهب (18)", icon: Coins, unit: "د.ل/ج" },
];

export default function App() {
  const [rates, setRates] = useState<Rates | null>(null);
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastFetchTime, setLastFetchTime] = useState<Date | null>(null);
  const [selectedRate, setSelectedRate] = useState<{ code: string, name: string, market: 'official' | 'parallel' } | null>(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [notificationsEnabled, setNotificationsEnabled] = useState(Notification.permission === 'granted');

  const requestNotificationPermission = async () => {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      setNotificationsEnabled(true);
    }
  };

  const showPriceNotification = (code: string, name: string, oldPrice: number, newPrice: number) => {
    if (Notification.permission !== 'granted') return;

    const diff = newPrice - oldPrice;
    const arrow = diff > 0 ? '📈' : '📉';
    const direction = diff > 0 ? 'ارتفاع' : 'انخفاض';
    
    const title = `تغير في سعر ${name}`;
    const body = `${arrow} ${direction} السعر الجديد: ${newPrice.toFixed(3)} د.ل (السابق: ${oldPrice.toFixed(3)})`;

    navigator.serviceWorker.ready.then((registration) => {
      registration.showNotification(title, {
        body,
        icon: 'https://hatscripts.github.io/circle-flags/flags/ly.svg',
        badge: 'https://hatscripts.github.io/circle-flags/flags/ly.svg',
        dir: 'rtl',
        lang: 'ar',
        tag: `price-change-${code}`,
        renotify: true
      } as any);
    });
  };

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Load from local storage on mount
    const savedRates = localStorage.getItem('lyd_rates');
    const savedHistory = localStorage.getItem('lyd_history');
    if (savedRates) setRates(JSON.parse(savedRates));
    if (savedHistory) setHistory(JSON.parse(savedHistory));

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const fetchData = async () => {
    try {
      const [ratesRes, historyRes] = await Promise.all([
        fetch("/api/rates"),
        fetch("/api/history"),
      ]);
      
      if (!ratesRes.ok || !historyRes.ok) {
        if (ratesRes.status === 502 || historyRes.status === 502) return;
        throw new Error("Network response was not ok");
      }

      const ratesContentType = ratesRes.headers.get("content-type");
      const historyContentType = historyRes.headers.get("content-type");

      if (!ratesContentType?.includes("application/json") || !historyContentType?.includes("application/json")) {
        return;
      }

      const newRates = await ratesRes.json();
      const newHistory = await historyRes.json();
      
      // Check for price changes to notify
      if (rates && notificationsEnabled) {
        Object.keys(newRates).forEach(code => {
          const oldPrice = rates[code]?.parallel?.buy;
          const newPrice = newRates[code]?.parallel?.buy;
          if (oldPrice && newPrice && oldPrice !== newPrice) {
            showPriceNotification(code, newRates[code].name, oldPrice, newPrice);
          }
        });
      }

      setRates(newRates);
      setHistory(newHistory);
      setLastFetchTime(new Date());

      // Persist to local storage
      localStorage.setItem('lyd_rates', JSON.stringify(newRates));
      localStorage.setItem('lyd_history', JSON.stringify(newHistory));
    } catch (error) {
      if (error instanceof TypeError && error.message === "Failed to fetch") {
        console.warn("Server might be restarting, retrying in next poll...");
      } else {
        console.error("Failed to fetch data:", error);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000); // Poll every 10 seconds
    return () => clearInterval(interval);
  }, []);

  if (loading && !rates) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="w-6 h-6 text-white animate-spin" />
          <p className="text-zinc-500 font-mono text-xs tracking-widest uppercase">Initializing...</p>
        </div>
      </div>
    );
  }

  const usdRate = rates?.parallel["USD"] || 0;
  const prevUsdRate = rates?.previousParallel?.["USD"] || usdRate;
  const usdIsUp = usdRate > prevUsdRate;
  const usdIsDown = usdRate < prevUsdRate;
  const usdChange = Math.abs(usdRate - prevUsdRate);

  const usdChecksRate = rates?.parallel["USD_CHECKS"] || 0;
  const prevUsdChecksRate = rates?.previousParallel?.["USD_CHECKS"] || usdChecksRate;
  const usdChecksIsUp = usdChecksRate > prevUsdChecksRate;
  const usdChecksIsDown = usdChecksRate < prevUsdChecksRate;

  const getChartData = () => {
    if (!selectedRate) return [];
    return history.map(h => {
      const rateObj = selectedRate.market === 'parallel' ? h.ratesParallel : h.ratesOfficial;
      return {
        time: h.time,
        value: rateObj ? rateObj[selectedRate.code] : (selectedRate.code === 'USD' ? (selectedRate.market === 'parallel' ? h.usdParallel : h.usdOfficial) : 0)
      };
    }).filter(d => d.value > 0);
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-emerald-500/20 relative overflow-hidden" dir="rtl">
      {/* Atmospheric Backgrounds */}
      <div className="fixed top-[-10%] left-[-10%] w-[500px] h-[500px] bg-emerald-600/10 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="fixed bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none"></div>

      {/* Popover Chart */}
      <AnimatePresence>
        {selectedRate && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedRate(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-[#0a0a0a] border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                    <Activity className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-white">{selectedRate.name}</h3>
                    <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest">
                      {selectedRate.market === 'parallel' ? 'السوق الموازي' : 'السوق الرسمي'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedRate(null)}
                  className="p-2 rounded-full hover:bg-white/10 transition-colors text-zinc-500 hover:text-white"
                >
                  <RefreshCw className="w-4 h-4 rotate-45" />
                </button>
              </div>
              
              <div className="p-6 h-[300px] sm:h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={getChartData()}>
                    <defs>
                      <linearGradient id="popoverGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis 
                      dataKey="time" 
                      hide={false}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#52525b', fontSize: 10, fontFamily: 'monospace' }}
                      tickFormatter={(t) => format(new Date(t), "HH:mm")}
                      minTickGap={30}
                    />
                    <YAxis 
                      domain={['auto', 'auto']} 
                      hide={false}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#52525b', fontSize: 10, fontFamily: 'monospace' }}
                      orientation="left"
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#0a0a0a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "16px", color: "#fff" }}
                      itemStyle={{ color: "#10b981", fontFamily: "monospace" }}
                      labelStyle={{ color: "#71717a", fontSize: "12px", marginBottom: "4px" }}
                      labelFormatter={(label) => format(new Date(label), "dd MMMM yyyy - HH:mm", { locale: ar })}
                      formatter={(value: number) => [value.toFixed(3) + ' د.ل', 'السعر']}
                    />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="#10b981"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#popoverGradient)"
                      animationDuration={1000}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              
              <div className="p-6 bg-white/[0.02] border-t border-white/5 flex items-center justify-between">
                <div className="text-xs text-zinc-500">
                  بيانات تاريخية مستخرجة من قاعدة البيانات
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                  <span className="text-[10px] font-mono text-emerald-500 uppercase tracking-widest">Live Data</span>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="border-b border-white/5 sticky top-0 z-50 bg-[#050505]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center">
              <Activity className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-base font-medium tracking-tight text-white">مؤشر الدينار الليبي</h1>
              <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest mt-0.5">LYD Index</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {!notificationsEnabled && (
              <button 
                onClick={requestNotificationPermission}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/20 transition-colors"
                title="تفعيل التنبيهات"
              >
                <Bell className="w-4 h-4" />
                <span className="text-[10px] font-medium uppercase tracking-wider hidden md:inline">تنبيهات الأسعار</span>
              </button>
            )}
            {isOffline && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></div>
                <span className="text-[10px] font-medium uppercase tracking-wider">وضع الأوفلاين</span>
              </div>
            )}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-[10px] font-mono text-zinc-300 tracking-wider uppercase" dir="ltr">
                {lastFetchTime ? format(lastFetchTime, "HH:mm:ss") : "..."}
              </span>
            </div>
            <button
              onClick={fetchData}
              className="p-2 rounded-full hover:bg-white/10 transition-colors text-zinc-400 hover:text-white"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-16 space-y-16 sm:space-y-24 relative z-10">
        
        {/* Hero Section: Parallel USD */}
        <section className="flex flex-col lg:flex-row items-start lg:items-end justify-between gap-8 lg:gap-12">
          <div className="w-full lg:w-auto">
            <div className="flex items-center gap-3 mb-4 sm:mb-6">
              <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full overflow-hidden shadow-[0_0_15px_rgba(16,185,129,0.3)] shrink-0">
                <img src="https://hatscripts.github.io/circle-flags/flags/us.svg" alt="US Flag" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              </div>
              <h2 className="text-sm sm:text-base font-medium text-emerald-400 tracking-wide">السوق الموازي • دولار أمريكي</h2>
            </div>
            
            <div 
              className="flex items-baseline gap-3 sm:gap-4 cursor-pointer group"
              onClick={() => setSelectedRate({ code: 'USD', name: 'دولار أمريكي (كاش)', market: 'parallel' })}
            >
              <AnimatePresence mode="popLayout">
                <motion.span
                  key={usdRate}
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="text-6xl sm:text-8xl lg:text-[140px] font-light text-white tracking-tighter font-mono leading-none group-hover:text-emerald-400 transition-colors"
                >
                  {usdRate.toFixed(2)}
                </motion.span>
              </AnimatePresence>
              <span className="text-xl sm:text-3xl lg:text-4xl text-zinc-500 font-light">د.ل</span>
            </div>
            
            <div className="flex flex-wrap items-center gap-4 sm:gap-6 mt-6 sm:mt-8">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-zinc-500">السعر السابق</span>
                <span className="font-mono text-zinc-300 text-base" dir="ltr">{prevUsdRate.toFixed(2)}</span>
              </div>
              {usdIsUp ? (
                <div className="flex items-center gap-1.5 text-rose-400 text-sm font-medium bg-rose-500/10 px-2.5 py-1 rounded-full border border-rose-500/20">
                  <ArrowUpRight className="w-4 h-4" />
                  <span className="font-mono" dir="ltr">+{usdChange.toFixed(2)}</span>
                </div>
              ) : usdIsDown ? (
                <div className="flex items-center gap-1.5 text-emerald-400 text-sm font-medium bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                  <ArrowDownRight className="w-4 h-4" />
                  <span className="font-mono" dir="ltr">-{usdChange.toFixed(2)}</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-zinc-400 text-sm font-medium bg-zinc-500/10 px-2.5 py-1 rounded-full border border-zinc-500/20">
                  <span className="font-mono" dir="ltr">0.00</span>
                </div>
              )}
            </div>

            {/* USD Checks Card */}
            <div 
              onClick={() => setSelectedRate({ code: 'USD_CHECKS', name: 'دولار أمريكي (صكوك)', market: 'parallel' })}
              className="mt-8 flex items-center gap-4 sm:gap-6 bg-white/[0.02] border border-white/5 rounded-2xl p-4 sm:p-5 w-full sm:w-fit hover:bg-white/[0.04] transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 shrink-0">
                  <Building2 className="w-5 h-5" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-zinc-500 font-medium mb-1">دولار (صكوك)</span>
                  <div className="flex items-center gap-2">
                    <span className="text-3xl font-light text-white font-mono leading-none group-hover:text-emerald-400 transition-colors">{usdChecksRate.toFixed(2)}</span>
                    {usdChecksIsUp ? <ArrowUpRight className="w-4 h-4 text-rose-400" /> : usdChecksIsDown ? <ArrowDownRight className="w-4 h-4 text-emerald-400" /> : null}
                  </div>
                </div>
              </div>
              <div className="w-px h-12 bg-white/10 mx-2"></div>
              <div className="flex flex-col justify-center">
                <span className="text-[10px] text-zinc-600 mb-1">السعر السابق</span>
                <span className="text-sm text-zinc-400 font-mono" dir="ltr">{prevUsdChecksRate.toFixed(2)}</span>
              </div>
            </div>

            {rates?.lastUpdated && (
              <div className="flex items-center gap-2 mt-6 text-[11px] sm:text-xs text-zinc-500 bg-white/5 w-fit px-3 py-1.5 rounded-full border border-white/5">
                <Clock className="w-3.5 h-3.5 text-emerald-500/70" />
                <span>آخر تحديث للبيانات: {format(new Date(rates.lastUpdated), "dd MMMM yyyy - HH:mm", { locale: ar })}</span>
              </div>
            )}
          </div>

          {/* Mini Sparkline Chart */}
          <div className="w-full lg:w-[400px] h-[100px] sm:h-[160px] min-w-0 min-h-0 opacity-80 hover:opacity-100 transition-opacity mt-8 lg:mt-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={history}>
                <defs>
                  <linearGradient id="colorUsd" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" hide />
                <YAxis domain={[(dataMin: number) => dataMin - 0.02, (dataMax: number) => dataMax + 0.02]} hide />
                <Tooltip
                  contentStyle={{ backgroundColor: "#050505", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", color: "#fff", boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.5)" }}
                  itemStyle={{ color: "#10b981", fontFamily: "monospace", fontSize: "16px" }}
                  labelStyle={{ color: "#71717a", fontSize: "12px", marginBottom: "4px" }}
                  labelFormatter={(label) => {
                    try {
                      return format(new Date(label), "dd MMM - HH:mm", { locale: ar });
                    } catch (e) {
                      return label;
                    }
                  }}
                  formatter={(value: number) => [value.toFixed(2) + ' د.ل', 'السعر']}
                />
                <Area
                  type="monotone"
                  dataKey="usdParallel"
                  stroke="#10b981"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorUsd)"
                  isAnimationActive={true}
                  activeDot={{ r: 4, fill: "#050505", stroke: "#10b981", strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Data Grid: Other Parallel Currencies */}
        <section>
          <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-8">
            <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-widest">السوق الموازي (عملات أخرى)</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-x-8 gap-y-12">
            {CURRENCIES.filter(c => c.code !== "USD").map(currency => {
              const rate = rates?.parallel[currency.code] || 0;
              const prevRate = rates?.previousParallel?.[currency.code] || rate;
              const isUp = rate > prevRate;
              const isDown = rate < prevRate;

              return (
                <div 
                  key={`parallel-${currency.code}`} 
                  onClick={() => setSelectedRate({ code: currency.code, name: currency.name, market: 'parallel' })}
                  className="flex flex-col group p-3 sm:p-4 rounded-2xl hover:bg-white/[0.02] transition-colors -m-3 sm:-m-4 cursor-pointer"
                >
                  <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                    <img src={`https://hatscripts.github.io/circle-flags/flags/${currency.flag}.svg`} alt={currency.name} className="w-5 h-5 sm:w-6 sm:h-6 drop-shadow-sm transition-transform group-hover:scale-110" referrerPolicy="no-referrer" />
                    <span className="text-[11px] sm:text-xs font-medium text-zinc-300">{currency.name}</span>
                  </div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-2xl font-light text-white font-mono tracking-tight group-hover:text-emerald-400 transition-colors">{rate.toFixed(2)}</span>
                    {isUp ? <ArrowUpRight className="w-3 h-3 text-rose-400" /> : isDown ? <ArrowDownRight className="w-3 h-3 text-emerald-400" /> : null}
                  </div>
                  <span className="text-[10px] text-zinc-600 font-mono" dir="ltr">Prev: {prevRate.toFixed(2)}</span>
                </div>
              );
            })}
            
            {PARALLEL_DETAILS.map(detail => {
              const rate = rates?.parallel[detail.code] || 0;
              const prevRate = rates?.previousParallel?.[detail.code] || rate;
              const isUp = rate > prevRate;
              const isDown = rate < prevRate;
              const Icon = detail.icon;

              return (
                <div 
                  key={`detail-${detail.code}`} 
                  onClick={() => setSelectedRate({ code: detail.code, name: detail.name, market: 'parallel' })}
                  className="flex flex-col group p-3 sm:p-4 rounded-2xl hover:bg-white/[0.02] transition-colors -m-3 sm:-m-4 cursor-pointer"
                >
                  <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                    {detail.flag ? (
                      <img src={`https://hatscripts.github.io/circle-flags/flags/${detail.flag}.svg`} alt={detail.name} className="w-5 h-5 sm:w-6 sm:h-6 drop-shadow-sm transition-transform group-hover:scale-110" referrerPolicy="no-referrer" />
                    ) : Icon ? (
                      <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                        <Icon className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                      </div>
                    ) : null}
                    <span className="text-[11px] sm:text-xs font-medium text-zinc-300">{detail.name}</span>
                  </div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-2xl font-light text-white font-mono tracking-tight group-hover:text-emerald-400 transition-colors">{rate.toFixed(2)}</span>
                    {isUp ? <ArrowUpRight className="w-3 h-3 text-rose-400" /> : isDown ? <ArrowDownRight className="w-3 h-3 text-emerald-400" /> : null}
                  </div>
                  <span className="text-[10px] text-zinc-600 font-mono" dir="ltr">Prev: {prevRate.toFixed(2)}</span>
                </div>
              );
            })}
          </div>
        </section>

        {/* Official Market Table */}
        <section>
          <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-8">
            <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-widest">السوق الرسمي (مصرف ليبيا المركزي)</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-x-8 gap-y-12">
            {CURRENCIES.map(currency => {
              const rate = rates?.official[currency.code] || 0;
              const prevRate = rates?.previousOfficial?.[currency.code] || rate;
              const isUp = rate > prevRate;
              const isDown = rate < prevRate;

              return (
                <div 
                  key={`official-${currency.code}`} 
                  onClick={() => setSelectedRate({ code: currency.code, name: currency.name, market: 'official' })}
                  className="flex flex-col group p-3 sm:p-4 rounded-2xl hover:bg-white/[0.02] transition-colors -m-3 sm:-m-4 cursor-pointer"
                >
                  <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                    <img src={`https://hatscripts.github.io/circle-flags/flags/${currency.flag}.svg`} alt={currency.name} className="w-4 h-4 sm:w-5 sm:h-5 drop-shadow-sm transition-transform group-hover:scale-110" referrerPolicy="no-referrer" />
                    <span className="text-[11px] sm:text-xs font-medium text-zinc-400">{currency.code}</span>
                  </div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xl font-light text-zinc-300 font-mono tracking-tight group-hover:text-emerald-400 transition-colors">{rate.toFixed(2)}</span>
                    {isUp ? <ArrowUpRight className="w-3 h-3 text-rose-400 opacity-70" /> : isDown ? <ArrowDownRight className="w-3 h-3 text-emerald-400 opacity-70" /> : null}
                  </div>
                  <span className="text-[10px] text-zinc-700 font-mono" dir="ltr">Prev: {prevRate.toFixed(2)}</span>
                </div>
              );
            })}
          </div>
        </section>

      </main>
    </div>
  );
}
