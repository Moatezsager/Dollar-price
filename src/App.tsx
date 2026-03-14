import { useEffect, useState, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import {
  ArrowLeftRight,
  ArrowDownRight,
  ArrowUpRight,
  RefreshCw,
  Activity,
  Building2,
  Coins,
  Clock,
  Bell,
  FileText,
  TrendingUp,
  Globe,
  Settings2,
  X,
  CheckCircle2,
  AlertCircle,
  Info,
  WifiOff,
  Zap
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { format, formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";
import { logErrorToServer } from "./utils/logger";

interface Rates {
  official: Record<string, number>;
  parallel: Record<string, number>;
  previousOfficial?: Record<string, number>;
  previousParallel?: Record<string, number>;
  lastUpdated: string;
  lastChanged?: {
    official: Record<string, string>;
    parallel: Record<string, string>;
  };
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
  const [notificationsEnabled, setNotificationsEnabled] = useState(
    typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted'
  );
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);
  const [notificationThreshold, setNotificationThreshold] = useState(0.001);
  const [toasts, setToasts] = useState<{ id: string, title: string, body: string, type: 'up' | 'down' | 'info' }[]>([]);
  const [onlineCount, setOnlineCount] = useState<number>(1);
  const [appStatus, setAppStatus] = useState<{ status: string, minutesSinceLastScrape: number } | null>(null);
  const [configTerms, setConfigTerms] = useState<any[]>([]);
  const reportRef = useRef<HTMLDivElement>(null);
  const ratesRef = useRef<Rates | null>(null);
  const thresholdRef = useRef<number>(0.001);
  const lastNotifiedRef = useRef<Record<string, number>>({});
  const configTermsRef = useRef<any[]>([]);

  // Keep refs in sync with state to avoid closure issues in setInterval
  useEffect(() => {
    ratesRef.current = rates;
  }, [rates]);

  useEffect(() => {
    configTermsRef.current = configTerms;
  }, [configTerms]);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await fetch('/api/config');
        const data = await response.json();
        if (data && data.terms) {
          setConfigTerms(data.terms);
        }
      } catch (error) {
        console.error("Failed to fetch config:", error);
        logErrorToServer(error, "App.tsx: fetchConfig");
      }
    };
    fetchConfig();
  }, []);

  useEffect(() => {
    thresholdRef.current = notificationThreshold;
  }, [notificationThreshold]);

  const addToast = (title: string, body: string, type: 'up' | 'down' | 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, title, body, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  };

  const showPriceNotification = async (code: string, name: string, oldPrice: number, newPrice: number) => {
    const diff = newPrice - oldPrice;
    const absDiff = Math.abs(diff);
    
    // 1. تحقق من حد التغيير (Threshold)
    if (absDiff < thresholdRef.current) return;

    // 2. منع التكرار الذكي: تحقق من آخر سعر تم التنبيه به وآخر وقت
    try {
      const lastNotifyData = localStorage.getItem(`last_notify_${code}`);
      if (lastNotifyData) {
        const { price, time } = JSON.parse(lastNotifyData);
        const timeDiff = Date.now() - time;
        
        // إذا كان السعر هو نفسه ولم يمر 10 دقائق، لا تكرر الإشعار
        if (price === newPrice && timeDiff < 10 * 60 * 1000) {
          console.log(`[Notification] Skipping duplicate for ${code}`);
          return;
        }
      }
    } catch (e) {
      console.warn("Notification storage check failed", e);
    }

    const direction = diff > 0 ? 'ارتفاع' : 'انخفاض';
    const arrow = diff > 0 ? '📈' : '📉';
    const title = `${arrow} ${direction} في سعر ${name}`;
    const body = `السعر الجديد: ${newPrice.toFixed(2)} د.ل (تغير بمقدار ${diff > 0 ? '+' : ''}${diff.toFixed(2)})`;

    // تسجيل التنبيه الحالي لمنع التكرار
    localStorage.setItem(`last_notify_${code}`, JSON.stringify({
      price: newPrice,
      time: Date.now()
    }));

    // In-app toast (دائماً يظهر للمستخدم النشط)
    addToast(title, body, diff > 0 ? 'up' : 'down');

    // Native notification
    try {
      if (Notification.permission === 'granted' && 'serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        if (registration) {
          await registration.showNotification(title, {
            body,
            icon: 'https://hatscripts.github.io/circle-flags/flags/ly.svg',
            badge: 'https://hatscripts.github.io/circle-flags/flags/ly.svg',
            vibrate: [200, 100, 200],
            tag: `price-change-${code}`, // استخدام Tag لمنع تراكم الإشعارات لنفس العملة
            renotify: true,
            data: { url: window.location.origin },
            silent: false,
            dir: 'rtl',
            actions: [
              { action: 'open', title: 'فتح التطبيق' }
            ]
          } as any);
        }
      }
    } catch (err) {
      console.error("Failed to show notification:", err);
      logErrorToServer(err, "App.tsx: showNotification");
    }
  };

  const generatePDF = async () => {
    if (!reportRef.current) return;
    setIsGeneratingPDF(true);
    try {
      // Ensure the report is visible for capture but off-screen
      const element = reportRef.current;
      element.style.display = 'block';
      
      // Small delay to ensure fonts are rendered
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const canvas = await html2canvas(element, {
        scale: 2, // Higher quality
        useCORS: true,
        backgroundColor: '#ffffff',
      });
      
      element.style.display = 'none';

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`تقرير-مؤشر-الدينار-${format(new Date(), 'yyyy-MM-dd-HHmm')}.pdf`);
    } catch (err) {
      console.error('Error generating PDF:', err);
      logErrorToServer(err, "App.tsx: generatePDF");
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const requestNotificationPermission = async () => {
    try {
      if (!("Notification" in window)) {
        addToast("غير مدعوم", "متصفحك لا يدعم الإشعارات", "info");
        return;
      }
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        setNotificationsEnabled(true);
        addToast("تم تفعيل التنبيهات", "ستصلك إشعارات عند تغير الأسعار الهامة", "info");
      } else {
        addToast("تم رفض التنبيهات", "يرجى تفعيل الإشعارات من إعدادات المتصفح", "info");
      }
    } catch (error) {
      console.error("Error requesting notification permission:", error);
      logErrorToServer(error, "App.tsx: requestNotificationPermission");
      addToast("خطأ", "تعذر تفعيل الإشعارات", "info");
    }
  };

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
    let socket: WebSocket | null = null;
    let reconnectTimeout: any = null;

    const connect = () => {
      try {
        socket = new WebSocket(wsUrl);

        socket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'online_count') {
              setOnlineCount(data.count);
            }
          } catch (err) {
            console.error('WebSocket message error:', err);
            logErrorToServer(err, "App.tsx: WebSocket onmessage");
          }
        };

        socket.onclose = () => {
          reconnectTimeout = setTimeout(connect, 3000);
        };

        socket.onerror = () => {
          socket?.close();
        };
      } catch (err) {
        console.error('WebSocket connection error:', err);
        logErrorToServer(err, "App.tsx: WebSocket connect");
        reconnectTimeout = setTimeout(connect, 5000);
      }
    };

    connect();

    // Fallback polling for online count
    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch('/api/online-count');
        const data = await res.json();
        setOnlineCount(data.count);
      } catch (err) {
        // Ignore polling errors
        logErrorToServer(err, "App.tsx: fetchOnlineCount polling");
      }
    }, 30000);

    return () => {
      socket?.close();
      clearTimeout(reconnectTimeout);
      clearInterval(pollInterval);
    };
  }, []);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Load from local storage on mount
    try {
      const savedRates = localStorage.getItem('lyd_rates');
      const savedHistory = localStorage.getItem('lyd_history');
      if (savedRates) setRates(JSON.parse(savedRates));
      if (savedHistory) setHistory(JSON.parse(savedHistory));
    } catch (err) {
      console.warn("LocalStorage not available:", err);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const fetchData = async (forceRefresh = false) => {
    setIsRefreshing(true);
    try {
      const [ratesResult, historyResult] = await Promise.allSettled([
        fetch(forceRefresh ? "/api/rates?refresh=true" : "/api/rates"),
        fetch("/api/history"),
      ]);
      
      if (ratesResult.status === 'rejected' || historyResult.status === 'rejected') {
        throw new Error("Network response was not ok");
      }

      const ratesRes = ratesResult.value;
      const historyRes = historyResult.value;

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
      
      // Check for price changes to notify using the ref to get the latest state
      let hasChanges = false;
      const currentRates = ratesRef.current;
      
      if (currentRates) {
        // Check all parallel currencies
        const currenciesToCheck = Object.keys(newRates.parallel);
        
        currenciesToCheck.forEach(code => {
          const oldPrice = currentRates.parallel[code];
          const newPrice = newRates.parallel[code];
          
          if (oldPrice && newPrice && Math.abs(oldPrice - newPrice) >= thresholdRef.current) {
            // Avoid notifying the same price twice in a row
            if (lastNotifiedRef.current[code] !== newPrice) {
              const term = configTermsRef.current.find(t => t.id === code);
              const name = term ? term.name : code;
              
              console.log(`Price change detected for ${code}: ${oldPrice} -> ${newPrice}`);
              showPriceNotification(code, name, oldPrice, newPrice);
              lastNotifiedRef.current[code] = newPrice;
              hasChanges = true;
            }
          }
        });

        // Also check official rates for major changes
        ["USD", "EUR"].forEach(code => {
          const oldPrice = currentRates.official[code];
          const newPrice = newRates.official[code];
          if (oldPrice && newPrice && Math.abs(oldPrice - newPrice) >= thresholdRef.current) {
            if (lastNotifiedRef.current[`OFFICIAL_${code}`] !== newPrice) {
              showPriceNotification(`OFFICIAL_${code}`, `السعر الرسمي - ${CURRENCIES.find(c => c.code === code)?.name}`, oldPrice, newPrice);
              lastNotifiedRef.current[`OFFICIAL_${code}`] = newPrice;
              hasChanges = true;
            }
          }
        });
      }

      setRates(newRates);
      setHistory(newHistory);
      setLastFetchTime(new Date());

      // Fetch status
      try {
        const statusRes = await fetch("/api/status");
        if (statusRes.ok) {
          const statusData = await statusRes.json();
          setAppStatus(statusData);
        }
      } catch (err) {
        // Ignore status fetch errors
        logErrorToServer(err, "App.tsx: fetchStatus");
      }

      // Persist to local storage
      try {
        localStorage.setItem('lyd_rates', JSON.stringify(newRates));
        localStorage.setItem('lyd_history', JSON.stringify(newHistory));
      } catch (err) {
        console.warn("Failed to save to localStorage:", err);
      }

      if (hasChanges) {
        addToast("تم تحديث الأسعار", "تم رصد تغييرات جديدة في السوق وتحديث البيانات", "info");
      } else if (lastFetchTime) {
        addToast("البيانات محدثة", "أنت تشاهد أحدث الأسعار المتوفرة حالياً", "info");
      }
    } catch (error) {
      if (error instanceof TypeError && error.message === "Failed to fetch") {
        console.warn("Server might be restarting, retrying in next poll...");
      } else {
        console.error("Failed to fetch data:", error);
        logErrorToServer(error, "App.tsx: fetchData");
        addToast("خطأ في التحديث", "تعذر الاتصال بالخادم، يرجى المحاولة لاحقاً", "info");
      }
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000); // Poll every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const chartData = useMemo(() => {
    if (!selectedRate || !history.length) return [];
    
    const data = history.map(h => {
      const rateObj = selectedRate.market === 'parallel' ? h.ratesParallel : h.ratesOfficial;
      let value = 0;
      
      // Attempt to get value from JSONB object first
      if (rateObj && rateObj[selectedRate.code] !== undefined && rateObj[selectedRate.code] !== null) {
        value = Number(rateObj[selectedRate.code]);
      } 
      
      // Fallback for main USD if not in JSONB
      if (value === 0 && selectedRate.code === 'USD') {
        value = selectedRate.market === 'parallel' ? h.usdParallel : h.usdOfficial;
      }
      
      return {
        time: h.time,
        value: value
      };
    }).filter(d => d.value > 0);

    // CRITICAL: Recharts needs data in ASCENDING order of time
    return [...data].sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
  }, [selectedRate, history]);

  const chartStats = useMemo(() => {
    if (!chartData.length) return { max: 0, min: 0, avg: 0 };
    const values = chartData.map(d => d.value);
    return {
      max: Math.max(...values),
      min: Math.min(...values),
      avg: values.reduce((a, b) => a + b, 0) / values.length
    };
  }, [chartData]);

  // حساب التغير خلال 24 ساعة لجميع العملات
  const trends24h = useMemo(() => {
    if (!history.length || !rates) return {};
    
    // العثور على أقرب سجل منذ 24 ساعة
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    
    const record24h = history.find(h => new Date(h.time) >= oneDayAgo) || history[0];
    if (!record24h) return {};

    const trends: Record<string, { parallel?: number, official?: number }> = {};

    // معالجة السوق الموازي
    Object.keys(rates.parallel).forEach(code => {
      const current = rates.parallel[code];
      const previous = record24h.ratesParallel?.[code] || (code === 'USD' ? record24h.usdParallel : null);
      if (current && previous) {
        trends[code] = { ...trends[code], parallel: ((current - previous) / previous) * 100 };
      }
    });

    // معالجة السوق الرسمي
    CURRENCIES.forEach(curr => {
      const current = rates.official[curr.code];
      const previous = record24h.ratesOfficial?.[curr.code] || (curr.code === 'USD' ? record24h.usdOfficial : null);
      if (current && previous) {
        trends[curr.code] = { ...trends[curr.code], official: ((current - previous) / previous) * 100 };
      }
    });

    return trends;
  }, [history, rates]);

  // منطق محول العملات
  const [converterAmount, setConverterAmount] = useState<number>(100);
  const [converterFrom, setConverterFrom] = useState<string>("USD");
  const [converterMarket, setConverterMarket] = useState<'parallel' | 'official'>("parallel");
  const [converterMode, setConverterMode] = useState<'toLYD' | 'fromLYD'>("toLYD");

  const converterResult = useMemo(() => {
    if (!rates) return 0;
    const rate = (converterMarket === 'parallel' ? rates.parallel[converterFrom] : rates.official[converterFrom]) || 0;
    if (rate === 0) return 0;
    
    return converterMode === 'toLYD' 
      ? converterAmount * rate 
      : converterAmount / rate;
  }, [converterAmount, converterFrom, converterMarket, converterMode, rates]);

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

  const LastChangedBadge = ({ date, className = "" }: { date?: string, className?: string }) => {
    if (!date) return null;
    try {
      return (
        <span className={`text-[9px] font-medium text-zinc-600 flex items-center gap-1 ${className}`}>
          <Clock className="w-2.5 h-2.5 opacity-50" />
          {formatDistanceToNow(new Date(date), { addSuffix: true, locale: ar })}
        </span>
      );
    } catch (e) {
      return null;
    }
  };

  const usdChecksRate = rates?.parallel["USD_CHECKS"] || 0;
  const prevUsdChecksRate = rates?.previousParallel?.["USD_CHECKS"] || usdChecksRate;
  const usdChecksIsUp = usdChecksRate > prevUsdChecksRate;
  const usdChecksIsDown = usdChecksRate < prevUsdChecksRate;

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-emerald-500/20 relative overflow-hidden" dir="rtl">
      {/* Atmospheric Backgrounds */}
      <div className="fixed top-[-10%] left-[-10%] w-[500px] h-[500px] bg-emerald-600/10 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="fixed bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none"></div>

      {/* Offline & Stale Data Warning - Top Banner */}
      <AnimatePresence>
        {(isOffline || appStatus?.status === 'stale') && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className={`relative z-[60] border-b overflow-hidden shadow-lg ${
              isOffline 
                ? 'bg-rose-500 border-rose-400 text-white' 
                : 'bg-amber-500 border-amber-400 text-black'
            }`}
          >
            <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${isOffline ? 'bg-white/20' : 'bg-black/10'} animate-pulse`}>
                  {isOffline ? <WifiOff className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-black uppercase tracking-widest">
                    {isOffline ? "أنت الآن في وضع الأوفلاين" : "تنبيه: البيانات قديمة"}
                  </span>
                  <p className="text-[11px] opacity-90 font-medium leading-tight">
                    {isOffline ? (
                      "يرجى التحقق من اتصال الإنترنت للحصول على آخر التحديثات اللحظية."
                    ) : (
                      `آخر تحديث كان منذ ${appStatus?.minutesSinceLastScrape} دقيقة. الأسعار قد تختلف.`
                    )}
                  </p>
                </div>
              </div>
              
              {isOffline && (
                <button 
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 bg-white text-rose-600 text-[11px] font-black rounded-xl hover:bg-zinc-100 transition-all active:scale-95 shadow-md shrink-0"
                >
                  تحديث الصفحة
                </button>
              )}
            </div>
          </motion.div>
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
              <h1 className="text-base font-medium tracking-tight text-white">مؤشر الدينار</h1>
              <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest mt-0.5">Dinar Index</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setShowNotificationSettings(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-zinc-400 hover:text-white transition-colors"
              title="إعدادات التنبيهات"
            >
              <Settings2 className="w-4 h-4" />
              <span className="text-[10px] font-medium uppercase tracking-wider hidden md:inline">الإعدادات</span>
            </button>
            
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
              onClick={generatePDF}
              disabled={isGeneratingPDF}
              className={`p-2 rounded-full hover:bg-white/10 transition-colors text-zinc-400 hover:text-white ${isGeneratingPDF ? 'animate-pulse' : ''}`}
              title="تحميل تقرير PDF احترافي"
            >
              <FileText className="w-4 h-4" />
            </button>
            <button
              onClick={() => fetchData(true)}
              disabled={isRefreshing}
              className={`p-2 rounded-full hover:bg-white/10 transition-colors text-zinc-400 hover:text-white ${isRefreshing ? 'animate-spin text-indigo-400' : ''}`}
              title="تحديث البيانات من قاعدة البيانات"
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
              <div className="flex items-center gap-2.5">
                <h2 className="text-sm sm:text-base font-medium text-emerald-400 tracking-wide">السوق الموازي • دولار أمريكي</h2>
                <div className="flex items-center gap-1.5 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                  </span>
                  <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Live</span>
                </div>
              </div>
            </div>
            
            <div 
              className="flex items-baseline gap-3 sm:gap-4 cursor-pointer group relative"
              onClick={() => setSelectedRate({ code: 'USD', name: 'دولار أمريكي (كاش)', market: 'parallel' })}
            >
              <AnimatePresence mode="popLayout">
                <motion.span
                  key={usdRate}
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="text-6xl sm:text-8xl lg:text-[140px] font-light text-white tracking-tighter font-mono leading-none group-hover:text-emerald-400 transition-colors relative z-10"
                >
                  {usdRate.toFixed(2)}
                </motion.span>
              </AnimatePresence>
              <span className="text-xl sm:text-3xl lg:text-4xl text-zinc-500 font-light">د.ل</span>
              
              <LastChangedBadge date={rates?.lastChanged?.parallel["USD"]} className="absolute -bottom-6 right-0" />

              {/* Subtle pulsing glow behind the price */}
              <motion.div 
                animate={{ 
                  opacity: [0.1, 0.2, 0.1],
                  scale: [1, 1.05, 1]
                }}
                transition={{ 
                  duration: 3, 
                  repeat: Infinity, 
                  ease: "easeInOut" 
                }}
                className="absolute -inset-4 bg-emerald-500/5 blur-2xl rounded-full -z-0 pointer-events-none"
              />
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
                  <LastChangedBadge date={rates?.lastChanged?.parallel["USD_CHECKS"]} className="mt-1" />
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
                <span>آخر تحديث: {formatDistanceToNow(new Date(rates.lastUpdated), { addSuffix: true, locale: ar })}</span>
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
                  isAnimationActive={history.length < 200}
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
            {configTerms.filter(t => t.id !== "USD" && t.id !== "OFFICIAL_USD").map(term => {
              const rate = rates?.parallel[term.id] || 0;
              const prevRate = rates?.previousParallel?.[term.id] || rate;
              const isUp = rate > prevRate;
              const isDown = rate < prevRate;

              return (
                <div 
                  key={`parallel-${term.id}`} 
                  onClick={() => setSelectedRate({ code: term.id, name: term.name, market: 'parallel' })}
                  className="flex flex-col group p-2.5 rounded-2xl hover:bg-white/[0.02] transition-colors -m-2.5 cursor-pointer relative"
                >
                  <div className="flex items-center justify-between mb-3 sm:mb-4">
                    <div className="flex items-center gap-2">
                      {term.flag ? (
                        <img src={`https://hatscripts.github.io/circle-flags/flags/${term.flag}.svg`} alt={term.name} className="w-5 h-5 drop-shadow-sm transition-transform group-hover:scale-110" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                          <Coins className="w-3 h-3" />
                        </div>
                      )}
                      <span className="text-[11px] font-medium text-zinc-400">{term.name}</span>
                    </div>
                    
                    {/* 24h Trend Badge */}
                    {trends24h[term.id]?.parallel !== undefined && (
                      <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-md ${
                        trends24h[term.id].parallel! > 0 ? 'bg-rose-500/10 text-rose-500' : 'bg-emerald-500/10 text-emerald-500'
                      }`}>
                        {trends24h[term.id].parallel! > 0 ? '+' : ''}{trends24h[term.id].parallel!.toFixed(1)}%
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-2xl font-light text-white font-mono tracking-tight group-hover:text-emerald-400 transition-colors">{rate.toFixed(2)}</span>
                    {isUp ? <ArrowUpRight className="w-3 h-3 text-rose-400" /> : isDown ? <ArrowDownRight className="w-3 h-3 text-emerald-400" /> : null}
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[9px] text-zinc-700 font-mono" dir="ltr">Prev: {prevRate.toFixed(2)}</span>
                    <LastChangedBadge date={rates?.lastChanged?.parallel[term.id]} />
                  </div>
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
                  className="flex flex-col group p-3 rounded-2xl hover:bg-white/[0.02] transition-colors -m-3 cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-3 sm:mb-4">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <img src={`https://hatscripts.github.io/circle-flags/flags/${currency.flag}.svg`} alt={currency.name} className="w-4 h-4 sm:w-5 sm:h-5 drop-shadow-sm transition-transform group-hover:scale-110" referrerPolicy="no-referrer" />
                      <span className="text-[11px] sm:text-xs font-medium text-zinc-400">{currency.code}</span>
                    </div>

                    {/* 24h Trend Badge */}
                    {trends24h[currency.code]?.official !== undefined && (
                      <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-md ${
                        trends24h[currency.code].official! > 0 ? 'bg-rose-500/10 text-rose-500' : 'bg-emerald-500/10 text-emerald-500'
                      }`}>
                        {trends24h[currency.code].official! > 0 ? '+' : ''}{trends24h[currency.code].official!.toFixed(1)}%
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xl font-light text-zinc-300 font-mono tracking-tight group-hover:text-emerald-400 transition-colors">{rate.toFixed(2)}</span>
                    {isUp ? <ArrowUpRight className="w-3 h-3 text-rose-400 opacity-70" /> : isDown ? <ArrowDownRight className="w-3 h-3 text-emerald-400 opacity-70" /> : null}
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[9px] text-zinc-800 font-mono" dir="ltr">Prev: {prevRate.toFixed(2)}</span>
                    <LastChangedBadge date={rates?.lastChanged?.official[currency.code]} />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Improved Currency Converter - Bottom Section */}
        <section className="mt-16">
          <div className="bg-gradient-to-br from-white/[0.05] to-transparent border border-white/10 rounded-[3rem] p-8 sm:p-12 shadow-2xl relative overflow-hidden group text-right" dir="rtl">
            {/* Background elements */}
            <div className="absolute top-0 left-0 p-12 opacity-5 group-hover:opacity-10 transition-opacity duration-1000">
              <RefreshCw className="w-48 h-48 text-white rotate-45" />
            </div>
            
            <div className="relative z-10">
              <div className="flex flex-col sm:flex-row items-center sm:justify-between gap-6 mb-12">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 shadow-inner">
                    <ArrowLeftRight className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-white tracking-tight">محول العملات</h3>
                    <p className="text-[11px] text-zinc-500 uppercase tracking-[0.2em] font-mono font-bold">Smart Exchange Calculator</p>
                  </div>
                </div>

                <div className="flex p-1.5 bg-white/[0.02] border border-white/5 rounded-2xl w-full sm:w-fit">
                  <button 
                    onClick={() => setConverterMarket('parallel')}
                    className={`flex-1 sm:flex-none py-2.5 px-6 rounded-xl text-[11px] font-black transition-all duration-300 ${converterMarket === 'parallel' ? 'bg-emerald-500 text-[#050505] shadow-[0_8px_20px_-4px_rgba(16,185,129,0.4)]' : 'text-zinc-500 hover:text-white'}`}
                  >
                    السوق الموازي
                  </button>
                  <button 
                    onClick={() => setConverterMarket('official')}
                    className={`flex-1 sm:flex-none py-2.5 px-6 rounded-xl text-[11px] font-black transition-all duration-300 ${converterMarket === 'official' ? 'bg-indigo-500 text-white shadow-[0_8px_20px_-4px_rgba(79,70,229,0.4)]' : 'text-zinc-500 hover:text-white'}`}
                  >
                    السعر الرسمي
                  </button>
                </div>
              </div>

              <div className="flex flex-col lg:grid lg:grid-cols-5 gap-6 lg:gap-8 items-stretch">
                {/* Source Input */}
                <div className="lg:col-span-2 space-y-4">
                  <div className="relative group/input">
                    <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mr-4 mb-2 block">المبلغ المراد تحويله</label>
                    <div className="relative">
                      <input 
                        type="number"
                        value={converterAmount || ''}
                        onChange={(e) => setConverterAmount(Number(e.target.value))}
                        className="w-full bg-white/[0.03] border border-white/10 rounded-[1.5rem] p-5 sm:p-6 text-white font-mono text-2xl sm:text-3xl focus:outline-none focus:border-emerald-500/40 transition-all duration-500 shadow-inner appearance-none"
                        placeholder="0.00"
                      />
                      <div className="absolute left-4 sm:left-6 top-1/2 -translate-y-1/2 text-zinc-600 font-bold text-sm sm:text-base">
                        {converterMode === 'toLYD' ? (configTerms.find(t => t.id === converterFrom)?.name.split(' ')[0] || converterFrom) : 'دينار ليبي'}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <select 
                        value={converterFrom}
                        onChange={(e) => setConverterFrom(e.target.value)}
                        className="w-full bg-white/[0.03] border border-white/5 rounded-2xl p-4 text-white font-bold focus:outline-none appearance-none cursor-pointer hover:bg-white/[0.05] transition-colors pr-4 text-sm sm:text-base"
                      >
                        {configTerms.filter(t => !["GOLD", "OFFICIAL_USD"].includes(t.id)).map(t => (
                          <option key={t.id} value={t.id} className="bg-[#121212]">{t.name}</option>
                        ))}
                      </select>
                    </div>
                    
                    <button 
                      onClick={() => setConverterMode(prev => prev === 'toLYD' ? 'fromLYD' : 'toLYD')}
                      className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-emerald-500 hover:text-black hover:border-emerald-500 transition-all duration-500 group/swap shrink-0"
                    >
                      <ArrowLeftRight className={`w-5 h-5 sm:w-6 sm:h-6 transition-transform duration-500 ${converterMode === 'fromLYD' ? 'rotate-180' : ''}`} />
                    </button>
                  </div>
                </div>

                {/* Arrow Decor - Hidden on mobile */}
                <div className="hidden lg:flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center animate-pulse">
                    <ArrowDownRight className="w-6 h-6 text-zinc-700 -rotate-45" />
                  </div>
                </div>

                {/* Result Display */}
                <div className="lg:col-span-2">
                  <div className="h-full bg-gradient-to-br from-white/[0.02] to-transparent border border-white/5 rounded-[2rem] p-6 sm:p-8 flex flex-col items-center justify-center text-center relative overflow-hidden group/result shadow-2xl min-h-[160px]">
                    <div className="absolute inset-0 bg-emerald-500/[0.01] opacity-0 group-hover/result:opacity-100 transition-opacity duration-700"></div>
                    
                    <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mb-4 sm:mb-6 block">النتيجة المقدرة</span>
                    
                    <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 relative z-10 w-full" dir="ltr">
                      <motion.span 
                        key={`${converterResult}-${converterMode}`}
                        initial={{ opacity: 0, scale: 0.9, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        className={`font-light text-white font-mono tracking-tighter break-all ${
                          converterResult.toString().length > 10 ? 'text-3xl sm:text-4xl' : 
                          converterResult.toString().length > 7 ? 'text-4xl sm:text-5xl' : 
                          'text-5xl sm:text-7xl'
                        }`}
                      >
                        {converterResult.toFixed(2)}
                      </motion.span>
                      <span className="text-xl sm:text-3xl text-emerald-500/70 font-light shrink-0">
                        {converterMode === 'fromLYD' ? (configTerms.find(t => t.id === converterFrom)?.name.split(' ')[0] || converterFrom) : 'د.ل'}
                      </span>
                    </div>

                    <div className="mt-6 sm:mt-10 flex items-center gap-3 text-[9px] sm:text-[10px] text-zinc-500 bg-black/40 px-4 sm:px-5 py-2 sm:py-2.5 rounded-full border border-white/5 backdrop-blur-md">
                      <Zap className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-yellow-500 animate-pulse" />
                      <span className="font-medium">بناءً على {converterMarket === 'parallel' ? 'أسعار السوق' : 'الأسعار الرسمية'} اللحظية</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="pt-16 pb-12 border-t border-white/5 flex flex-col items-center gap-8">
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center gap-4 opacity-40 grayscale hover:opacity-100 hover:grayscale-0 transition-all duration-500">
              <div 
                className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center cursor-pointer"
                onClick={() => window.location.href = '/admin'}
                title="Admin Dashboard"
              >
                <Activity className="w-3 h-3 text-white" />
              </div>
              <span className="text-[10px] font-mono tracking-[0.2em] uppercase text-zinc-400">Dinar Index Libya</span>
            </div>
            
            {/* Online Count Badge - Elegant Style */}
            <div className="flex items-center gap-3 px-4 py-2 rounded-2xl bg-white/[0.03] border border-white/5 shadow-inner">
              <div className="flex items-center gap-2">
                <div className="relative flex h-2 w-2">
                  <div className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-40"></div>
                  <div className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></div>
                </div>
                <span className="text-[11px] font-mono text-zinc-300 tracking-tighter">
                  {onlineCount.toLocaleString()}
                </span>
              </div>
              <div className="w-px h-3 bg-white/10"></div>
              <span className="text-[9px] font-medium text-zinc-500 uppercase tracking-widest">متواجد الآن</span>
            </div>
          </div>
          
          <div className="flex flex-col items-center gap-2">
            <p className="text-[11px] text-zinc-500 font-light tracking-wide">
              by <span className="text-white font-medium">GreenBox</span> © 2026
            </p>
            <div className="flex items-center gap-3 mt-2">
              <div className="w-1 h-1 rounded-full bg-emerald-500/30"></div>
              <div className="w-1 h-1 rounded-full bg-emerald-500/50"></div>
              <div className="w-1 h-1 rounded-full bg-emerald-500/30"></div>
            </div>
          </div>
        </footer>
      </main>

      {/* In-App Toasts */}
      <div className="fixed bottom-6 left-6 z-[200] flex flex-col gap-3 w-full max-w-sm pointer-events-none">
        <AnimatePresence>
          {toasts.map(toast => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: -50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
              className="pointer-events-auto bg-[#0a0a0a]/90 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl flex items-start gap-4"
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                toast.type === 'up' ? 'bg-rose-500/10 text-rose-400' : 
                toast.type === 'down' ? 'bg-emerald-500/10 text-emerald-400' : 
                'bg-blue-500/10 text-blue-400'
              }`}>
                {toast.type === 'up' ? <ArrowUpRight className="w-5 h-5" /> : 
                 toast.type === 'down' ? <ArrowDownRight className="w-5 h-5" /> : 
                 <Info className="w-5 h-5" />}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium text-white mb-1">{toast.title}</h4>
                <p className="text-xs text-zinc-400 leading-relaxed">{toast.body}</p>
              </div>
              <button 
                onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
                className="text-zinc-600 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Notification Settings Modal */}
      <AnimatePresence>
        {showNotificationSettings && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowNotificationSettings(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-[#0a0a0a] border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                    <Settings2 className="w-4 h-4" />
                  </div>
                  <h3 className="text-lg font-medium">إعدادات التنبيهات الذكية</h3>
                </div>
                <button onClick={() => setShowNotificationSettings(false)} className="text-zinc-500 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-8">
                {/* Permission Status */}
                <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5">
                  <div className="flex items-center gap-3">
                    {notificationsEnabled ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-amber-500" />
                    )}
                    <div>
                      <p className="text-sm font-medium">حالة التنبيهات</p>
                      <p className="text-[10px] text-zinc-500">{notificationsEnabled ? 'مفعلة على هذا الجهاز' : 'غير مفعلة حالياً'}</p>
                    </div>
                  </div>
                  {!notificationsEnabled && (
                    <button 
                      onClick={requestNotificationPermission}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-xl transition-colors"
                    >
                      تفعيل الآن
                    </button>
                  )}
                </div>

                {/* Threshold Slider */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-zinc-300">حساسية التنبيه (Threshold)</label>
                    <span className="text-xs font-mono text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded-lg">
                      {notificationThreshold.toFixed(2)} د.ل
                    </span>
                  </div>
                  <input 
                    type="range" 
                    min="0.001" 
                    max="0.1" 
                    step="0.001" 
                    value={notificationThreshold}
                    onChange={(e) => setNotificationThreshold(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                  <p className="text-[10px] text-zinc-500 leading-relaxed">
                    سيقوم التطبيق بإرسال تنبيه فقط إذا تغير السعر بمقدار أكبر من القيمة المحددة أعلاه. القيمة الحالية ({notificationThreshold.toFixed(3)}) تجعل التنبيهات حساسة جداً لأي تغيير.
                  </p>
                </div>

                {/* Features List */}
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-xs text-zinc-400">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                    <span>تنبيهات فورية عند تغير سعر الدولار (كاش)</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-zinc-400">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                    <span>متابعة لحظية لأسعار الذهب (كسر 18)</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-zinc-400">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                    <span>نظام اهتزاز مخصص للهواتف عند الارتفاع الحاد</span>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-white/[0.02] border-t border-white/5">
                <button 
                  onClick={() => setShowNotificationSettings(false)}
                  className="w-full py-3 bg-white text-black text-sm font-bold rounded-2xl hover:bg-zinc-200 transition-colors"
                >
                  حفظ الإعدادات
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
      {/* Currency Chart Modal */}
      <AnimatePresence>
        {selectedRate && (
          <div className="fixed inset-0 z-[160] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedRate(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-4xl bg-[#0a0a0a] border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-white/5 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">{selectedRate.name}</h3>
                    <p className="text-xs text-zinc-500 uppercase tracking-widest mt-0.5">
                      {selectedRate.market === 'parallel' ? 'السوق الموازي' : 'السوق الرسمي'} • {selectedRate.code}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedRate(null)} 
                  className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 flex-1 overflow-y-auto custom-scrollbar flex flex-col">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex flex-col">
                    <span className="text-xs text-zinc-500 mb-1">السعر الحالي</span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-mono font-bold text-white">
                        {(selectedRate.market === 'parallel' ? rates?.parallel[selectedRate.code] : rates?.official[selectedRate.code])?.toFixed(2)}
                      </span>
                      <span className="text-sm text-zinc-500">د.ل</span>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <div className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/5 text-[10px] font-medium text-zinc-400 uppercase tracking-widest">
                      آخر 24 ساعة
                    </div>
                  </div>
                </div>

                <div className="flex-1 min-h-[350px] w-full relative">
                  {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%" key={selectedRate.code}>
                      <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                        <defs>
                          <linearGradient id="modalChartGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0.05}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid 
                          vertical={false} 
                          stroke="rgba(255,255,255,0.03)" 
                          strokeDasharray="3 3" 
                        />
                        <XAxis 
                          dataKey="time" 
                          hide 
                        />
                        <YAxis 
                          domain={[(dataMin: number) => dataMin - (dataMin * 0.01), (dataMax: number) => dataMax + (dataMax * 0.01)]} 
                          orientation="right"
                          tick={{ fontSize: 10, fill: '#71717a', fontFamily: 'monospace' }}
                          axisLine={false}
                          tickLine={false}
                          tickFormatter={(val) => val.toFixed(2)}
                          width={40}
                        />
                        <Tooltip
                          contentStyle={{ 
                            backgroundColor: "#0a0a0a", 
                            border: "1px solid rgba(255,255,255,0.1)", 
                            borderRadius: "16px", 
                            color: "#fff", 
                            boxShadow: "0 20px 50px -12px rgba(0, 0, 0, 0.5)",
                            padding: "12px"
                          }}
                          itemStyle={{ color: "#10b981", fontFamily: "monospace", fontSize: "18px", fontWeight: "bold" }}
                          labelStyle={{ color: "#71717a", fontSize: "11px", marginBottom: "6px", fontWeight: "medium" }}
                          labelFormatter={(label) => {
                            try {
                              return format(new Date(label), "eeee, dd MMMM - HH:mm", { locale: ar });
                            } catch (e) {
                              return label;
                            }
                          }}
                          formatter={(value: number) => [value.toFixed(3) + ' د.ل', 'السعر']}
                        />
                        <Area
                          type="monotone"
                          dataKey="value"
                          stroke="#10b981"
                          strokeWidth={3}
                          fillOpacity={1}
                          fill="url(#modalChartGradient)"
                          dot={{ r: 3, fill: "#10b981", stroke: "#0a0a0a", strokeWidth: 2, fillOpacity: 1 }}
                          activeDot={{ r: 6, fill: "#10b981", stroke: "#0a0a0a", strokeWidth: 3 }}
                          isAnimationActive={false} // Disable animation for faster rendering in modal
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="flex flex-col items-center gap-2 opacity-20">
                        <TrendingUp className="w-8 h-8" />
                        <p className="text-xs font-mono">لا توجد بيانات تاريخية كافية</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-8 grid grid-cols-3 gap-4">
                  <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                    <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">أعلى سعر</p>
                    <p className="text-lg font-mono font-bold text-white">
                      {chartStats.max.toFixed(2)}
                    </p>
                  </div>
                  <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                    <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">أدنى سعر</p>
                    <p className="text-lg font-mono font-bold text-white">
                      {chartStats.min.toFixed(2)}
                    </p>
                  </div>
                  <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                    <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">متوسط السعر</p>
                    <p className="text-lg font-mono font-bold text-white">
                      {chartStats.avg.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-white/[0.02] border-t border-white/5 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2 text-[10px] text-zinc-500">
                  <Info className="w-3 h-3" />
                  <span>البيانات معروضة لآخر 24 ساعة من التداولات</span>
                </div>
                <button 
                  onClick={() => setSelectedRate(null)}
                  className="px-6 py-2 bg-white text-black text-xs font-bold rounded-xl hover:bg-zinc-200 transition-colors"
                >
                  إغلاق
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Hidden PDF Template */}
      <div 
        ref={reportRef} 
        style={{ 
          display: 'none', 
          position: 'absolute', 
          left: '-9999px', 
          width: '800px',
          padding: '60px',
          backgroundColor: '#ffffff',
          color: '#0f172a',
          fontFamily: "'Cairo', sans-serif",
          lineHeight: '1.5'
        }}
        dir="rtl"
      >
        {/* PDF Header - Professional Branding */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '50px', borderBottom: '4px solid #10b981', paddingBottom: '30px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                <Activity size={24} />
              </div>
              <h1 style={{ fontSize: '32px', fontWeight: '800', color: '#0f172a', margin: '0', fontFamily: "'Cairo', sans-serif" }}>مؤشر الدينار</h1>
            </div>
            <p style={{ fontSize: '16px', color: '#64748b', margin: '0', fontWeight: '600', fontFamily: "'Cairo', sans-serif" }}>التقرير اليومي لتحليل أسعار الصرف في ليبيا</p>
          </div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ backgroundColor: '#f8fafc', padding: '12px 20px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
              <p style={{ fontSize: '11px', color: '#94a3b8', margin: '0 0 4px', textTransform: 'uppercase', fontWeight: '700', fontFamily: "'Cairo', sans-serif" }}>تاريخ الإصدار</p>
              <p style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a', margin: '0', fontFamily: "'Cairo', sans-serif" }}>{format(new Date(), "dd MMMM yyyy", { locale: ar })}</p>
              <p style={{ fontSize: '14px', fontWeight: '600', color: '#64748b', margin: '2px 0 0', fontFamily: "'Cairo', sans-serif" }}>{format(new Date(), "HH:mm")}</p>
            </div>
          </div>
        </div>

        {/* Market Overview - Highlight Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '40px' }}>
          <div style={{ padding: '24px', borderRadius: '24px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <p style={{ fontSize: '14px', color: '#166534', fontWeight: '700', margin: '0', fontFamily: "'Cairo', sans-serif" }}>الدولار الأمريكي (كاش)</p>
              <div style={{ padding: '4px 10px', borderRadius: '8px', backgroundColor: '#16a34a', color: 'white', fontSize: '10px', fontWeight: '800', fontFamily: "'Cairo', sans-serif" }}>الأكثر تداولاً</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <span style={{ fontSize: '42px', fontWeight: '800', color: '#14532d', fontFamily: "'Cairo', sans-serif" }}>{usdRate.toFixed(2)}</span>
              <span style={{ fontSize: '18px', color: '#166534', fontWeight: '600', fontFamily: "'Cairo', sans-serif" }}>د.ل</span>
            </div>
            <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '12px', borderTop: '1px solid #bbf7d0', paddingTop: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '10px', color: '#166534', opacity: 0.6, fontWeight: '700', fontFamily: "'Cairo', sans-serif" }}>السعر السابق</span>
                <span style={{ fontSize: '14px', fontWeight: '700', color: '#14532d', fontFamily: "'Cairo', sans-serif" }}>{prevUsdRate.toFixed(2)}</span>
              </div>
              <div style={{ width: '1px', height: '24px', backgroundColor: '#bbf7d0' }}></div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '10px', color: '#166534', opacity: 0.6, fontWeight: '700', fontFamily: "'Cairo', sans-serif" }}>التغير اليومي</span>
                <span style={{ fontSize: '14px', fontWeight: '700', color: usdIsUp ? '#dc2626' : '#16a34a', fontFamily: "'Cairo', sans-serif" }}>
                  {usdIsUp ? '↑' : '↓'} {usdChange.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
          <div style={{ padding: '24px', borderRadius: '24px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <p style={{ fontSize: '14px', color: '#475569', fontWeight: '700', margin: '0', fontFamily: "'Cairo', sans-serif" }}>الدولار الأمريكي (صكوك)</p>
              <div style={{ padding: '4px 10px', borderRadius: '8px', backgroundColor: '#475569', color: 'white', fontSize: '10px', fontWeight: '800', fontFamily: "'Cairo', sans-serif" }}>المعاملات المصرفية</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <span style={{ fontSize: '42px', fontWeight: '800', color: '#1e293b', fontFamily: "'Cairo', sans-serif" }}>{usdChecksRate.toFixed(2)}</span>
              <span style={{ fontSize: '18px', color: '#475569', fontWeight: '600', fontFamily: "'Cairo', sans-serif" }}>د.ل</span>
            </div>
            <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '12px', borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '10px', color: '#64748b', opacity: 0.6, fontWeight: '700', fontFamily: "'Cairo', sans-serif" }}>السعر السابق</span>
                <span style={{ fontSize: '14px', fontWeight: '700', color: '#1e293b', fontFamily: "'Cairo', sans-serif" }}>{prevUsdChecksRate.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Rates Table */}
        <div style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', fontFamily: "'Cairo', sans-serif" }}>
            <div style={{ width: '8px', height: '18px', backgroundColor: '#10b981', borderRadius: '2px' }}></div>
            أسعار السوق الموازي الرئيسية
          </h2>
          <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 8px' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'right', padding: '12px 20px', fontSize: '12px', color: '#94a3b8', fontWeight: '700', fontFamily: "'Cairo', sans-serif" }}>العملة</th>
                <th style={{ textAlign: 'center', padding: '12px 20px', fontSize: '12px', color: '#94a3b8', fontWeight: '700', fontFamily: "'Cairo', sans-serif" }}>السعر الحالي</th>
                <th style={{ textAlign: 'center', padding: '12px 20px', fontSize: '12px', color: '#94a3b8', fontWeight: '700', fontFamily: "'Cairo', sans-serif" }}>السعر السابق</th>
                <th style={{ textAlign: 'left', padding: '12px 20px', fontSize: '12px', color: '#94a3b8', fontWeight: '700', fontFamily: "'Cairo', sans-serif" }}>الحالة</th>
              </tr>
            </thead>
            <tbody>
              {configTerms.filter(c => ["EUR", "GBP", "GOLD", "TND"].includes(c.id)).map(c => {
                const rate = rates?.parallel[c.id] || 0;
                const prev = rates?.previousParallel?.[c.id] || rate;
                const isUp = rate > prev;
                return (
                  <tr key={`pdf-row-${c.id}`} style={{ backgroundColor: '#f8fafc' }}>
                    <td style={{ padding: '16px 20px', borderRadius: '16px 0 0 16px', fontWeight: '700', color: '#1e293b', fontFamily: "'Cairo', sans-serif" }}>{c.name}</td>
                    <td style={{ textAlign: 'center', padding: '16px 20px', fontSize: '18px', fontWeight: '800', color: '#0f172a', fontFamily: "'Cairo', sans-serif" }}>{rate.toFixed(2)}</td>
                    <td style={{ textAlign: 'center', padding: '16px 20px', color: '#64748b', fontWeight: '600', fontFamily: "'Cairo', sans-serif" }}>{prev.toFixed(2)}</td>
                    <td style={{ textAlign: 'left', padding: '16px 20px', borderRadius: '0 16px 16px 0', color: isUp ? '#dc2626' : '#16a34a', fontWeight: '700', fontFamily: "'Cairo', sans-serif" }}>
                      {rate === prev ? 'ثابت' : isUp ? '↑ ارتفاع' : '↓ انخفاض'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Official Rates Section */}
        <div style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', fontFamily: "'Cairo', sans-serif" }}>
            <div style={{ width: '8px', height: '18px', backgroundColor: '#3b82f6', borderRadius: '2px' }}></div>
            نشرة أسعار الصرف الرسمية
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
            {CURRENCIES.filter(c => ["USD", "EUR", "GBP"].includes(c.code)).map(c => (
              <div key={`pdf-off-${c.code}`} style={{ padding: '20px', borderRadius: '20px', border: '1px solid #e2e8f0', backgroundColor: '#ffffff' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <img src={`https://hatscripts.github.io/circle-flags/flags/${c.flag}.svg`} alt={c.name} style={{ width: '20px', height: '20px' }} referrerPolicy="no-referrer" />
                  <span style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', fontFamily: "'Cairo', sans-serif" }}>{c.code}</span>
                </div>
                <p style={{ fontSize: '24px', fontWeight: '800', color: '#1e293b', margin: '0', fontFamily: "'Cairo', sans-serif" }}>{(rates?.official[c.code] || 0).toFixed(3)}</p>
                <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px', fontWeight: '600', fontFamily: "'Cairo', sans-serif" }}>دينار ليبي / وحدة</p>
              </div>
            ))}
          </div>
        </div>

        {/* PDF Footer - Professional Disclaimer */}
        <div style={{ marginTop: '80px', paddingTop: '30px', borderTop: '1px solid #e2e8f0', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '40px', marginBottom: '20px' }}>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '700', marginBottom: '4px', fontFamily: "'Cairo', sans-serif" }}>المصدر</p>
              <p style={{ fontSize: '12px', color: '#475569', fontWeight: '700', fontFamily: "'Cairo', sans-serif" }}>شبكة مراسلي مؤشر الدينار</p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '700', marginBottom: '4px', fontFamily: "'Cairo', sans-serif" }}>الموقع الإلكتروني</p>
              <p style={{ fontSize: '12px', color: '#475569', fontWeight: '700', fontFamily: "'Cairo', sans-serif" }}>dinar-index.ly</p>
            </div>
          </div>
          <p style={{ fontSize: '11px', color: '#94a3b8', lineHeight: '1.6', maxWidth: '500px', margin: '0 auto', fontFamily: "'Cairo', sans-serif" }}>
            هذا التقرير استرشادي فقط ويعبر عن متوسط أسعار السوق اللحظية. لا يتحمل التطبيق أي مسؤولية عن القرارات المالية المتخذة بناءً على هذه البيانات.
          </p>
        </div>
      </div>
    </div>
  );
}
