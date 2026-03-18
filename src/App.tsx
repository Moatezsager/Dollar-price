import { useEffect, useState, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import Joyride, { Step, CallBackProps, STATUS, TooltipRenderProps } from 'react-joyride';
import {
  ArrowLeftRight,
  ArrowDownRight,
  ArrowUpRight,
  ArrowRight,
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
  Zap,
  Send
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
import { FlagIcon } from "./components/FlagIcon";

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
  { code: "JOD", name: "دينار أردني", flag: "jo" },
  { code: "BHD", name: "دينار بحريني", flag: "bh" },
  { code: "KWD", name: "دينار كويتي", flag: "kw" },
  { code: "AED", name: "درهم إماراتي", flag: "ae" },
  { code: "SAR", name: "ريال سعودي", flag: "sa" },
  { code: "QAR", name: "ريال قطري", flag: "qa" },
  { code: "CNY", name: "يوان صيني", flag: "cn" },
];

const PARALLEL_DETAILS = [
  { code: "USD_TR", name: "حوالات تركيا", flag: "tr", unit: "د.ل" },
  { code: "USD_AE", name: "حوالات دبي", flag: "ae", unit: "د.ل" },
  { code: "USD_CN", name: "حوالات الصين", flag: "cn", unit: "د.ل" },
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
  const [runTour, setRunTour] = useState(false);
  const [tourSteps] = useState<Step[]>([
    {
      target: 'body',
      title: 'مرحباً بك في منصة المؤشر!',
      content: 'أهلاً بك في منصة المؤشر لأسعار الصرف. دعنا نأخذك في جولة سريعة ومبسطة للتعرف على أهم الميزات التي ستساعدك في متابعة السوق. يرجى العلم أنه قد تختلف الأسعار بفارق بسيط بين المدن.',
      placement: 'center',
      disableBeacon: true,
    },
    {
      target: '#main-rates-grid',
      title: 'أسعار السوق الموازي',
      content: 'هنا يمكنك متابعة أحدث أسعار العملات الأجنبية في السوق الموازي لحظة بلحظة، مع مؤشرات التغير (ارتفاع أو انخفاض).',
      placement: 'bottom',
    },
    {
      target: '#checks-grid',
      title: 'أسعار الصكوك',
      content: 'في هذا القسم، يمكنك متابعة أسعار الدولار مقابل صكوك المصارف التجارية المختلفة.',
      placement: 'bottom',
    },
    {
      target: '#transfers-grid',
      title: 'حوالات العملة',
      content: 'هنا تجد أسعار حوالات العملة إلى خارج ليبيا (مثل تركيا، دبي، والصين) لتسهيل معاملاتك التجارية.',
      placement: 'bottom',
    },
    {
      target: '#official-rates-grid',
      title: 'أسعار السوق الرسمي',
      content: 'يعرض هذا القسم أسعار الصرف الرسمية المعتمدة من مصرف ليبيا المركزي للعملات الرئيسية.',
      placement: 'top',
    },
    {
      target: '#historical-chart',
      title: 'الرسم البياني للتغيرات',
      content: 'يعرض هذا الرسم البياني المصغر مسار تغير سعر الدولار في السوق الموازي خلال الفترة الماضية ليعطيك نظرة عامة سريعة.',
      placement: 'bottom',
    },
    {
      target: '#currency-converter-section',
      title: 'محول العملات الذكي',
      content: 'أداة قوية وسريعة لحساب القيم بين الدينار الليبي والعملات الأخرى بناءً على أحدث الأسعار.',
      placement: 'top',
    },
    {
      target: '#market-toggle',
      title: 'تحديد نوع السوق',
      content: 'يمكنك التبديل بين أسعار السوق الموازي والأسعار الرسمية لحسابات أكثر دقة حسب احتياجك.',
      placement: 'bottom',
    },
    {
      target: '#converter-input',
      title: 'إدخال المبلغ',
      content: 'أدخل المبلغ هنا، واختر العملة، وسيقوم المحول بحساب القيمة فوراً وبشكل تلقائي.',
      placement: 'top',
    },
    {
      target: '#notification-settings-btn',
      title: 'التنبيهات الذكية',
      content: 'من هنا يمكنك تفعيل وتخصيص التنبيهات لتصلك إشعارات فورية عند تغير أسعار العملات التي تهمك.',
      placement: 'bottom',
    },
    {
      target: '#export-pdf-btn',
      title: 'تصدير تقرير PDF',
      content: 'يمكنك بنقرة واحدة تحميل تقرير احترافي بصيغة PDF يحتوي على جميع الأسعار الحالية لمشاركته أو حفظه.',
      placement: 'bottom',
    }
  ]);

  const CustomTooltip = ({
    continuous,
    index,
    step,
    size,
    backProps,
    closeProps,
    primaryProps,
    skipProps,
    tooltipProps,
    isLastStep,
  }: TooltipRenderProps) => {
    const isFirstStep = index === 0;
    
    return (
      <div 
        {...tooltipProps} 
        className="relative bg-zinc-900/95 backdrop-blur-xl border border-white/10 rounded-3xl p-6 w-[360px] max-w-[90vw] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.1)] overflow-hidden" 
        dir="rtl"
      >
        {/* Glow effect */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 blur-[60px] rounded-full pointer-events-none -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500/10 blur-[60px] rounded-full pointer-events-none translate-y-1/2 -translate-x-1/2"></div>

        {/* Header */}
        <div className="flex items-start justify-between mb-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-blue-500/20 flex items-center justify-center border border-emerald-500/20 shrink-0">
              <span className="text-emerald-400 font-black text-lg">{index + 1}</span>
            </div>
            <h3 className="text-white font-black text-lg tracking-tight bg-clip-text text-transparent bg-gradient-to-l from-white to-zinc-400">
              {step.title}
            </h3>
          </div>
          
          <button 
            {...closeProps} 
            className="text-zinc-500 hover:text-white hover:bg-white/10 transition-all p-1.5 rounded-full shrink-0 group"
            onClick={(e) => {
              if (closeProps.onClick) closeProps.onClick(e);
              setRunTour(false);
              localStorage.setItem('tourCompleted', 'true');
            }}
          >
            <X className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
          </button>
        </div>

        {/* Content */}
        <div className="text-zinc-400 text-sm leading-relaxed mb-8 font-medium relative z-10 pl-2 pr-2">
          {step.content}
        </div>

        {/* Progress & Actions */}
        <div className="flex flex-col gap-4 relative z-10">
          {/* Custom Progress Bar */}
          <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-l from-emerald-500 to-blue-500 rounded-full transition-all duration-500 relative"
              style={{ width: `${((index + 1) / size) * 100}%` }}
            >
              <div className="absolute inset-0 bg-white/20 w-full animate-[shimmer_2s_infinite]"></div>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-2">
              {!isFirstStep && (
                <button {...backProps} className="px-3 py-2 text-xs font-bold text-zinc-500 hover:text-white hover:bg-white/5 rounded-xl transition-all uppercase tracking-widest">
                  السابق
                </button>
              )}
              {isFirstStep && (
                <button {...skipProps} className="px-3 py-2 text-xs font-bold text-zinc-500 hover:text-white hover:bg-white/5 rounded-xl transition-all uppercase tracking-widest">
                  تخطي الجولة
                </button>
              )}
            </div>
            
            <button 
              {...primaryProps} 
              className="group px-6 py-2.5 text-xs font-black bg-gradient-to-l from-emerald-500 to-emerald-400 text-[#050505] rounded-xl hover:from-emerald-400 hover:to-emerald-300 transition-all shadow-[0_8px_20px_-6px_rgba(16,185,129,0.5)] active:scale-95 uppercase tracking-widest flex items-center gap-2"
            >
              {isLastStep ? 'إنهاء الجولة' : 'التالي'}
              {!isLastStep && <ArrowRight className="w-3.5 h-3.5 -scale-x-100 group-hover:translate-x-1 transition-transform" />}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status, action } = data;
    const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];
    
    if (finishedStatuses.includes(status) || action === 'close') {
      setRunTour(false);
      localStorage.setItem('tourCompleted', 'true');
    }
  };

  useEffect(() => {
    const tourCompleted = localStorage.getItem('tourCompleted');
    if (!tourCompleted) {
      // Small delay to ensure DOM is ready
      setTimeout(() => setRunTour(true), 1500);
    }
  }, []);

  const reportRef = useRef<HTMLDivElement>(null);
  const ratesRef = useRef<Rates | null>(null);
  const thresholdRef = useRef<number>(0.001);
  const lastNotifiedRef = useRef<Record<string, number>>({});
  const configTermsRef = useRef<any[]>([]);

  // Derive dynamic currencies from configTerms to support user-added currencies
  const dynamicCurrencies = useMemo(() => {
    if (configTerms.length === 0) return CURRENCIES;
    return configTerms
      .filter(t => t.id !== "OFFICIAL_USD" && !t.id.startsWith("USD_") && t.id !== "GOLD")
      .map(t => ({ code: t.id, name: t.name, flag: t.flag }));
  }, [configTerms]);

  // Keep refs in sync with state to avoid closure issues in setInterval
  useEffect(() => {
    ratesRef.current = rates;
  }, [rates]);

  useEffect(() => {
    configTermsRef.current = configTerms;
  }, [configTerms]);

  const fetchConfig = async () => {
    try {
      const response = await fetch(`/api/config?t=${Date.now()}`);
      const data = await response.json();
      if (data && data.terms) {
        setConfigTerms(data.terms);
      }
    } catch (error) {
      console.error("Failed to fetch config:", error);
      logErrorToServer(error, "App.tsx: fetchConfig");
    }
  };

  useEffect(() => {
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
    try {
      localStorage.setItem(`last_notify_${code}`, JSON.stringify({
        price: newPrice,
        time: Date.now()
      }));
    } catch (e) {
      console.warn("Failed to save notification state to localStorage", e);
    }

    // In-app toast (دائماً يظهر للمستخدم النشط)
    addToast(title, body, diff > 0 ? 'up' : 'down');

    // Native notification
    try {
      if (Notification.permission === 'granted' && 'serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        if (registration) {
          await registration.showNotification(title, {
            body,
            icon: 'https://flagcdn.com/w80/ly.png',
            badge: 'https://flagcdn.com/w80/ly.png',
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
    setIsGeneratingPDF(true);
    addToast("جاري التجهيز للطباعة...", "سيتم فتح نافذة حفظ التقرير كـ PDF", "info");
    
    // Give the UI a moment to update state before locking the thread with window.print()
    setTimeout(() => {
      try {
        window.print();
        addToast("تم الاستخراج", "تم عرض نافذة الطباعة/الحفظ بنجاح", "up");
      } catch (err: any) {
        console.error('Error during native print:', err);
        logErrorToServer(err, "App.tsx: generatePDF");
        addToast("خطأ فني في التقرير", "حدث خطأ داخلي أثناء فتح نافذة طباعة المتصفح", "info");
      } finally {
        setIsGeneratingPDF(false);
      }
    }, 500);
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
      if (forceRefresh) {
        await fetchConfig();
      }
      const [ratesResult, historyResult] = await Promise.allSettled([
        fetch(forceRefresh ? "/api/rates?refresh=true" : "/api/rates", { signal: AbortSignal.timeout(30000) }),
        fetch("/api/history", { signal: AbortSignal.timeout(30000) }),
      ]);
      
      if (ratesResult.status === 'rejected') {
        throw ratesResult.reason;
      }
      if (historyResult.status === 'rejected') {
        throw historyResult.reason;
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

      const newRates: Rates = await ratesRes.json();
      const newHistory = await historyRes.json();
      
      // Check for price changes to notify using the ref to get the latest state
      let hasChanges = false;
      const currentRates = ratesRef.current;
      
      if (currentRates) {
        // Only notify if the change is significant and the new date is newer than what we have
        const isNewer = new Date(newRates.lastUpdated).getTime() > new Date(currentRates.lastUpdated).getTime();
        
        if (isNewer) {
          // Check all parallel currencies
          const currenciesToCheck = Object.keys(newRates.parallel);
          
          currenciesToCheck.forEach(code => {
            const oldPrice = currentRates.parallel[code];
            const newPrice = newRates.parallel[code];
            
            // Significant change threshold (0.001 Dinar)
            if (oldPrice && newPrice && Math.abs(oldPrice - newPrice) >= thresholdRef.current) {
              // Avoid notifying the same price twice if it hasn't changed since last notify
              if (lastNotifiedRef.current[code] !== newPrice) {
                const term = configTermsRef.current.find(t => t.id === code);
                const name = term ? term.name : code;
                
                showPriceNotification(code, name, oldPrice, newPrice).catch(err => {
                  console.error("Error showing notification:", err);
                });
                lastNotifiedRef.current[code] = newPrice;
                hasChanges = true;
              }
            }
          });
        }
      }

      setRates(newRates);
      setHistory(newHistory);
      // We use server-provided lastUpdated for business logic, but keep track of sync time
      setLastFetchTime(new Date());

      // Fetch status
      try {
        const statusRes = await fetch("/api/status");
        if (statusRes.ok) {
          const statusData = await statusRes.json();
          setAppStatus(statusData);
        }
      } catch (err) {
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
      }
    } catch (error) {
      if (error instanceof TypeError && error.message === "Failed to fetch") {
        console.warn("Server might be restarting or network is down...");
      } else if (error instanceof Error && error.name === 'AbortError') {
        console.warn("Fetch request timed out");
      } else {
        const isNetworkError = error instanceof Error && error.message.includes("Network response was not ok");
        
        if (!isNetworkError) {
          console.error("Failed to fetch data:", error);
          logErrorToServer(error, "App.tsx: fetchData");
        } else {
          console.warn("Fetch data failed: Network response was not ok");
        }
        
        // Only show toast if it was a manual refresh
        if (forceRefresh) {
          addToast("خطأ في التحديث", "تعذر الاتصال بالخادم، يرجى المحاولة لاحقاً", "info");
        }
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
    dynamicCurrencies.forEach(curr => {
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

  const PdfFlagIcon = ({ flagCode, size = 24 }: { flagCode?: string, size?: number }) => {
    const code = flagCode?.trim().toLowerCase();
    if (!code || code === "undefined" || code === "null") {
      return (
        <div style={{ width: `${size}px`, height: `${size}px`, borderRadius: '50%', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #e2e8f0', flexShrink: 0 }}>
          <Coins size={size * 0.6} color="#94a3b8" />
        </div>
      );
    }
    
    let objectPosition = "center";
    if (["ae", "us", "jo", "ps", "dz", "kw", "om", "qa"].includes(code)) {
      objectPosition = "left center";
    }

    return (
      <div style={{ width: `${size}px`, height: `${size}px`, borderRadius: '50%', overflow: 'hidden', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', flexShrink: 0 }}>
        <img 
          src={`https://flagcdn.com/w160/${code}.png`} 
          alt="flag"
          style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition, transform: 'scale(1.05)' }}
          crossOrigin="anonymous"
        />
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-emerald-500/20 relative overflow-hidden" dir="rtl">
      <Joyride
        steps={tourSteps}
        run={runTour}
        continuous={true}
        showSkipButton={true}
        showProgress={true}
        callback={handleJoyrideCallback}
        tooltipComponent={CustomTooltip}
        spotlightPadding={12}
        scrollOffset={100}
        floaterProps={{
          disableAnimation: true,
          styles: {
            floater: {
              filter: 'drop-shadow(0 20px 40px rgba(0,0,0,0.5))',
            },
            arrow: {
              length: 8,
              spread: 16,
            }
          }
        }}
        styles={{
          options: {
            zIndex: 1000,
            overlayColor: 'rgba(0, 0, 0, 0.75)',
            arrowColor: '#121212',
          }
        }}
      />
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
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 border border-emerald-500/20 flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.1)]">
              <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-sm sm:text-lg font-black tracking-tight text-white">المؤشر</h1>
              <p className="text-[9px] sm:text-[10px] text-emerald-500/70 font-mono uppercase tracking-[0.2em] mt-0.5">Al-Moasher</p>
            </div>
          </div>
          
          <div className="flex items-center gap-1.5 sm:gap-3">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/5 bg-white/[0.02]">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-[10px] font-mono text-zinc-400 tracking-wider uppercase" dir="ltr">
                {lastFetchTime ? format(lastFetchTime, "HH:mm:ss") : "..."}
              </span>
            </div>

            <div className="h-4 w-[1px] bg-white/10 hidden md:block mx-1"></div>

            <button 
              onClick={() => {
                setRunTour(true);
                localStorage.removeItem('tourCompleted');
              }}
              className="flex items-center justify-center w-8 h-8 sm:w-auto sm:h-auto sm:px-3 sm:py-1.5 rounded-full bg-white/5 border border-white/10 text-zinc-400 hover:text-white hover:bg-white/10 transition-all"
              title="جولة تعريفية"
            >
              <Info className="w-4 h-4" />
              <span className="text-[10px] font-bold uppercase tracking-wider hidden sm:inline sm:mr-2">مساعدة</span>
            </button>
            
            <button 
              id="notification-settings-btn"
              onClick={() => setShowNotificationSettings(true)}
              className="flex items-center justify-center w-8 h-8 sm:w-auto sm:h-auto sm:px-3 sm:py-1.5 rounded-full bg-white/5 border border-white/10 text-zinc-400 hover:text-white hover:bg-white/10 transition-all"
              title="إعدادات التنبيهات"
            >
              <Settings2 className="w-4 h-4" />
              <span className="text-[10px] font-bold uppercase tracking-wider hidden sm:inline sm:mr-2">الإعدادات</span>
            </button>
            
            <div className="h-4 w-[1px] bg-white/10 mx-0.5 sm:mx-1"></div>
            
            <button
              id="export-pdf-btn"
              onClick={generatePDF}
              disabled={isGeneratingPDF}
              className={`flex items-center justify-center w-8 h-8 rounded-full hover:bg-white/10 transition-all text-zinc-400 hover:text-white ${isGeneratingPDF ? 'animate-pulse' : ''}`}
              title="تحميل تقرير PDF احترافي"
            >
              <FileText className="w-4 h-4" />
            </button>
            
            <button
              onClick={() => fetchData(true)}
              disabled={isRefreshing}
              className={`flex items-center justify-center w-8 h-8 rounded-full hover:bg-white/10 transition-all text-zinc-400 hover:text-white ${isRefreshing ? 'animate-spin text-emerald-400' : ''}`}
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
              <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.3)] shrink-0">
                <FlagIcon flagCode="us" name="US Flag" className="w-full h-full" />
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
                  <FlagIcon flagCode="us" name="دولار أمريكي (صكوك)" className="w-10 h-10" fallbackType="building" />
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
          <div id="historical-chart" className="w-full lg:w-[400px] h-[100px] sm:h-[160px] min-w-0 min-h-0 opacity-80 hover:opacity-100 transition-opacity mt-8 lg:mt-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={history.filter(h => h.usdParallel > 0)}>
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
        <section id="main-rates-grid" className="space-y-16">
          {/* 1. Foreign Currencies Group */}
          <div>
            <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-8">
              <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-widest">السوق الموازي (عملات أجنبية)</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-x-8 gap-y-12">
              {configTerms.filter(t => t.id !== "USD" && t.id !== "OFFICIAL_USD" && !t.id.startsWith("USD_")).map(term => {
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
                        <FlagIcon flagCode={term.flag} name={term.name} fallbackType="coins" />
                        <span className="text-[11px] font-medium text-zinc-400">{term.name}</span>
                      </div>
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
                      <span className="text-[9px] text-zinc-700 font-mono" dir="ltr">السابق: {prevRate.toFixed(2)}</span>
                      <LastChangedBadge date={rates?.lastChanged?.parallel[term.id]} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2. Bank Checks Group */}
          <div id="checks-grid">
            <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-8">
              <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-widest">أسعار صكوك المصارف التجارية (USD)</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-x-8 gap-y-12">
              {configTerms.filter(t => t.id.startsWith("USD_") && !["USD_AE", "USD_TR", "USD_CN"].includes(t.id)).map(term => {
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
                        <FlagIcon flagCode={term.flag} name={term.name} fallbackType="building" />
                        <span className="text-[11px] font-medium text-zinc-400">{term.name}</span>
                      </div>
                      {trends24h[term.id]?.parallel !== undefined && (
                        <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-md ${
                          trends24h[term.id].parallel! > 0 ? 'bg-rose-500/10 text-rose-500' : 'bg-emerald-500/10 text-emerald-500'
                        }`}>
                          {trends24h[term.id].parallel! > 0 ? '+' : ''}{trends24h[term.id].parallel!.toFixed(1)}%
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-2xl font-light text-white font-mono tracking-tight group-hover:text-blue-400 transition-colors">{rate.toFixed(2)}</span>
                      {isUp ? <ArrowUpRight className="w-3 h-3 text-rose-400" /> : isDown ? <ArrowDownRight className="w-3 h-3 text-emerald-400" /> : null}
                    </div>
                    <div className="flex items-center justify-between gap-2">
                       <span className="text-[9px] text-zinc-700 font-mono" dir="ltr">السابق: {prevRate.toFixed(2)}</span>
                       <LastChangedBadge date={rates?.lastChanged?.parallel[term.id]} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 3. Transfers Group */}
          <div id="transfers-grid">
            <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-8">
              <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-widest">حوالات العملة (خارج ليبيا)</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-x-8 gap-y-12">
              {configTerms.filter(t => ["USD_AE", "USD_TR", "USD_CN"].includes(t.id)).map(term => {
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
                        <FlagIcon flagCode={term.flag} name={term.name} fallbackType="send" />
                        <span className="text-[11px] font-medium text-zinc-400">{term.name}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-2xl font-light text-white font-mono tracking-tight group-hover:text-indigo-400 transition-colors">{rate.toFixed(2)}</span>
                      {trends24h[term.id]?.parallel !== undefined && (
                        <span className={`text-[10px] font-mono font-medium px-1.5 py-0.5 rounded-md flex items-center gap-0.5 ${
                          trends24h[term.id].parallel! > 0 ? 'bg-rose-500/10 text-rose-500' : 
                          trends24h[term.id].parallel! < 0 ? 'bg-emerald-500/10 text-emerald-500' : 
                          'bg-zinc-500/10 text-zinc-400'
                        }`}>
                          {trends24h[term.id].parallel! > 0 ? <ArrowUpRight className="w-3 h-3" /> : 
                           trends24h[term.id].parallel! < 0 ? <ArrowDownRight className="w-3 h-3" /> : null}
                          <span dir="ltr">{Math.abs(trends24h[term.id].parallel!).toFixed(1)}%</span>
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-2">
                       <span className="text-[9px] text-zinc-700 font-mono" dir="ltr">السابق: {prevRate.toFixed(2)}</span>
                       <LastChangedBadge date={rates?.lastChanged?.parallel[term.id]} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Official Market Table */}
        <section id="official-rates-grid">
          <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-8">
            <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-widest">السوق الرسمي (مصرف ليبيا المركزي)</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-x-8 gap-y-12">
            {dynamicCurrencies.map(currency => {
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
                      <FlagIcon flagCode={currency.flag} name={currency.name} className="w-4 h-4 sm:w-5 sm:h-5" fallbackType="coins" />
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
        <section id="currency-converter-section" className="mt-16">
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

                <div id="market-toggle" className="flex p-1.5 bg-white/[0.02] border border-white/5 rounded-2xl w-full sm:w-fit">
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
                <div id="converter-input" className="lg:col-span-2 space-y-4">
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
                        {converterResult % 1 === 0 ? converterResult : converterResult.toFixed(2)}
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
        {/* PDF Export Banner */}
        <section className="px-4 sm:px-6 w-full max-w-7xl mx-auto my-12" id="pdf-banner-section">
          <div className="relative bg-[#0a0a0a]/50 border border-emerald-500/20 rounded-[2rem] p-8 sm:p-12 overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8 backdrop-blur-md">
            {/* Glow effects */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 blur-[80px] rounded-full pointer-events-none translate-x-1/2 -translate-y-1/2"></div>
            
            <div className="flex items-start gap-6 relative z-10 w-full md:w-auto">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-blue-500/20 flex flex-shrink-0 items-center justify-center border border-emerald-500/30">
                <FileText className="w-8 h-8 text-emerald-400" />
              </div>
              <div className="flex flex-col gap-2">
                <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight">تقرير الأسعار الموثق</h3>
                <p className="text-sm font-medium text-zinc-400 max-w-md leading-relaxed">
                  احصل على تقرير PDF شامل ودقيق يحتوي على الأسعار الحالية للسوق الموازي والرسمي بمظهر مرئي احترافي جاهز للطباعة أو المشاركة.
                </p>
              </div>
            </div>

            <button
              id="main-export-pdf-btn"
              onClick={generatePDF}
              disabled={isGeneratingPDF}
              className={`relative z-10 px-8 py-4 bg-gradient-to-l from-emerald-500 to-emerald-400 text-black rounded-2xl font-black text-sm lg:text-base hover:from-emerald-400 hover:to-emerald-300 transition-all shadow-[0_10px_30px_-10px_rgba(16,185,129,0.5)] active:scale-95 flex items-center justify-center gap-3 w-full md:w-auto tracking-widest uppercase ${isGeneratingPDF ? 'opacity-80' : ''}`}
            >
              {isGeneratingPDF ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>جاري التحضير...</span>
                </>
              ) : (
                <>
                  <FileText className="w-5 h-5" />
                  <span>تحميل التقرير (PDF)</span>
                </>
              )}
            </button>
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
                  <FlagIcon 
                    flagCode={configTerms.find(t => t.id === selectedRate.code)?.flag || CURRENCIES.find(c => c.code === selectedRate.code)?.flag} 
                    name={selectedRate.name} 
                    className="w-10 h-10 text-emerald-400" 
                    fallbackType="coins" 
                  />
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

                <div className="w-full h-[350px] relative mt-4">
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

      {/* Hidden PDF Template - Unlocked by @media print */}
      <div 
        id="pdf-report-container"
        ref={reportRef} 
        className="hidden" // Tailwind utility for display: none on screens
        style={{ 
          width: '210mm', // A4 exact width
          minHeight: '297mm', // A4 exact min-height
          backgroundColor: '#ffffff',
          color: '#0f172a',
          fontFamily: "'Cairo', sans-serif",
          lineHeight: '1.5',
          direction: 'rtl',
          margin: '0 auto',
          padding: '0'
        }}
        dir="rtl"
      >
        {/* PDF Header - Modern Dark Theme */}
        <div style={{ backgroundColor: '#0f172a', padding: '40px', borderBottom: '6px solid #10b981', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '16px', backgroundColor: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)' }}>
              <Activity size={32} />
            </div>
            <div>
              <h1 style={{ fontSize: '36px', fontWeight: '900', color: '#ffffff', margin: '0', letterSpacing: '-0.5px' }}>مؤشر الدينار</h1>
              <p style={{ fontSize: '16px', color: '#94a3b8', margin: '4px 0 0', fontWeight: '600' }}>التقرير الشامل لأسعار الصرف في السوق الليبي</p>
            </div>
          </div>
          <div style={{ textAlign: 'left', backgroundColor: 'rgba(255, 255, 255, 0.05)', padding: '16px 24px', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
            <p style={{ fontSize: '12px', color: '#94a3b8', margin: '0 0 4px', textTransform: 'uppercase', fontWeight: '700' }}>تاريخ الإصدار</p>
            <p style={{ fontSize: '18px', fontWeight: '800', color: '#ffffff', margin: '0' }}>{format(new Date(), "dd MMMM yyyy", { locale: ar })}</p>
            <p style={{ fontSize: '14px', fontWeight: '600', color: '#10b981', margin: '2px 0 0' }}>{format(new Date(), "HH:mm")}</p>
          </div>
        </div>

        <div style={{ padding: '40px' }}>
          {/* Market Overview - Highlight Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '40px' }}>
            {/* Card 1: USD Cash */}
            <div style={{ padding: '24px', borderRadius: '20px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, right: 0, width: '4px', height: '100%', backgroundColor: '#16a34a' }}></div>
              <p style={{ fontSize: '14px', color: '#166534', fontWeight: '800', margin: '0 0 12px' }}>الدولار الأمريكي (كاش)</p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                <span style={{ fontSize: '36px', fontWeight: '900', color: '#14532d' }}>{usdRate.toFixed(2)}</span>
                <span style={{ fontSize: '16px', color: '#166534', fontWeight: '700' }}>د.ل</span>
              </div>
              <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #bbf7d0', paddingTop: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '11px', color: '#166534', opacity: 0.7, fontWeight: '700' }}>السعر السابق</span>
                  <span style={{ fontSize: '14px', fontWeight: '800', color: '#14532d' }}>{prevUsdRate.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                  <span style={{ fontSize: '11px', color: '#166534', opacity: 0.7, fontWeight: '700' }}>التغير</span>
                  <span style={{ fontSize: '14px', fontWeight: '800', color: usdIsUp ? '#dc2626' : '#16a34a', direction: 'ltr' }}>
                    {usdIsUp ? '▲' : '▼'} {Math.abs(usdChange).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Card 2: USD Checks */}
            <div style={{ padding: '24px', borderRadius: '20px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, right: 0, width: '4px', backgroundColor: '#3b82f6', height: '100%' }}></div>
              <p style={{ fontSize: '14px', color: '#1e293b', fontWeight: '800', margin: '0 0 12px' }}>الدولار (صكوك الجمهورية)</p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                <span style={{ fontSize: '36px', fontWeight: '900', color: '#0f172a' }}>{usdChecksRate.toFixed(2)}</span>
                <span style={{ fontSize: '16px', color: '#475569', fontWeight: '700' }}>د.ل</span>
              </div>
              <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '700' }}>السعر السابق</span>
                  <span style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a' }}>{prevUsdChecksRate.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                  <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '700' }}>التغير</span>
                  <span style={{ fontSize: '14px', fontWeight: '800', color: (usdChecksRate > prevUsdChecksRate) ? '#dc2626' : '#16a34a', direction: 'ltr' }}>
                    {(usdChecksRate > prevUsdChecksRate) ? '▲' : '▼'} {Math.abs(usdChecksRate - prevUsdChecksRate).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Card 3: EUR */}
            <div style={{ padding: '24px', borderRadius: '20px', backgroundColor: '#fdf4ff', border: '1px solid #fbcfe8', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, right: 0, width: '4px', backgroundColor: '#d946ef', height: '100%' }}></div>
              <p style={{ fontSize: '14px', color: '#86198f', fontWeight: '800', margin: '0 0 12px' }}>اليورو (كاش)</p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                <span style={{ fontSize: '36px', fontWeight: '900', color: '#4a044e' }}>{(rates?.parallel['EUR'] || 0).toFixed(2)}</span>
                <span style={{ fontSize: '16px', color: '#86198f', fontWeight: '700' }}>د.ل</span>
              </div>
              <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #fbcfe8', paddingTop: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '11px', color: '#86198f', opacity: 0.7, fontWeight: '700' }}>السعر السابق</span>
                  <span style={{ fontSize: '14px', fontWeight: '800', color: '#4a044e' }}>{(rates?.previousParallel?.['EUR'] || rates?.parallel['EUR'] || 0).toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                  <span style={{ fontSize: '11px', color: '#86198f', opacity: 0.7, fontWeight: '700' }}>التغير</span>
                  <span style={{ fontSize: '14px', fontWeight: '800', color: ((rates?.parallel['EUR'] || 0) > (rates?.previousParallel?.['EUR'] || 0)) ? '#dc2626' : '#16a34a', direction: 'ltr' }}>
                    {((rates?.parallel['EUR'] || 0) > (rates?.previousParallel?.['EUR'] || 0)) ? '▲' : '▼'} {Math.abs((rates?.parallel['EUR'] || 0) - (rates?.previousParallel?.['EUR'] || 0)).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Comprehensive Parallel Rates Table */}
          <div style={{ marginBottom: '40px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '6px', height: '20px', backgroundColor: '#10b981', borderRadius: '4px' }}></div>
              أسعار السوق الموازي (شامل)
            </h2>
            <div style={{ borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  <tr>
                    <th style={{ textAlign: 'right', padding: '16px 24px', fontSize: '13px', color: '#475569', fontWeight: '800' }}>العملة / الصنف</th>
                    <th style={{ textAlign: 'center', padding: '16px 24px', fontSize: '13px', color: '#475569', fontWeight: '800' }}>السعر الحالي</th>
                    <th style={{ textAlign: 'center', padding: '16px 24px', fontSize: '13px', color: '#475569', fontWeight: '800' }}>السعر السابق</th>
                    <th style={{ textAlign: 'left', padding: '16px 24px', fontSize: '13px', color: '#475569', fontWeight: '800' }}>مؤشر التغير</th>
                  </tr>
                </thead>
                <tbody>
                  {configTerms.filter(c => c.id !== 'OFFICIAL_USD').map((c, idx) => {
                    const rate = rates?.parallel[c.id] || 0;
                    if (rate === 0) return null; // Skip empty rates
                    const prev = rates?.previousParallel?.[c.id] || rate;
                    const isUp = rate > prev;
                    const isEven = idx % 2 === 0;
                    return (
                      <tr key={`pdf-row-${c.id}`} style={{ backgroundColor: isEven ? '#ffffff' : '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '14px 24px', fontWeight: '700', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <PdfFlagIcon flagCode={c.flag} size={24} />
                          {c.name}
                        </td>
                        <td style={{ textAlign: 'center', padding: '14px 24px', fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>
                          {rate.toFixed(2)}
                        </td>
                        <td style={{ textAlign: 'center', padding: '14px 24px', fontSize: '14px', color: '#64748b', fontWeight: '600' }}>
                          {prev.toFixed(2)}
                        </td>
                        <td style={{ textAlign: 'left', padding: '14px 24px', fontWeight: '800', color: rate === prev ? '#64748b' : isUp ? '#dc2626' : '#16a34a', direction: 'ltr' }}>
                          {rate === prev ? '-' : isUp ? `▲ +${(rate - prev).toFixed(2)}` : `▼ ${(rate - prev).toFixed(2)}`}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Official Rates Grid */}
          <div style={{ marginBottom: '40px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '6px', height: '20px', backgroundColor: '#3b82f6', borderRadius: '4px' }}></div>
              نشرة أسعار الصرف الرسمية (مصرف ليبيا المركزي)
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
              {dynamicCurrencies.filter(c => rates?.official[c.code]).map(c => (
                <div key={`pdf-off-${c.code}`} style={{ padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <PdfFlagIcon flagCode={c.flag} size={20} />
                    <span style={{ fontSize: '12px', fontWeight: '800', color: '#475569' }}>{c.code}</span>
                  </div>
                  <p style={{ fontSize: '20px', fontWeight: '900', color: '#0f172a', margin: '0' }}>{(rates?.official[c.code] || 0).toFixed(3)}</p>
                </div>
              ))}
            </div>
          </div>

          {/* PDF Footer - Copyright & Disclaimer */}
          <div style={{ marginTop: '60px', paddingTop: '30px', borderTop: '2px solid #e2e8f0', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginBottom: '24px' }}>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '800', marginBottom: '4px', textTransform: 'uppercase' }}>المصدر</p>
                <p style={{ fontSize: '14px', color: '#0f172a', fontWeight: '800', margin: '0' }}>شبكة مراسلي مؤشر الدينار</p>
              </div>
              <div style={{ textAlign: 'left' }}>
                <p style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '800', marginBottom: '4px', textTransform: 'uppercase' }}>الموقع الإلكتروني</p>
                <p style={{ fontSize: '14px', color: '#0f172a', fontWeight: '800', margin: '0' }}>dinar-index.ly</p>
              </div>
            </div>
            
            <div style={{ backgroundColor: '#f1f5f9', padding: '16px 24px', borderRadius: '12px', width: '100%', textAlign: 'center', marginBottom: '24px' }}>
              <p style={{ fontSize: '12px', color: '#64748b', lineHeight: '1.6', margin: '0', fontWeight: '600' }}>
                هذا التقرير استرشادي فقط ويعبر عن متوسط أسعار السوق اللحظية وقت الإصدار. لا يتحمل التطبيق أي مسؤولية عن القرارات المالية المتخذة بناءً على هذه البيانات.
              </p>
            </div>

            {/* GreenBox Copyright */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: 0.8 }}>
              <div style={{ width: '24px', height: '24px', borderRadius: '6px', backgroundColor: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                <Building2 size={14} />
              </div>
              <span style={{ fontSize: '14px', fontWeight: '900', color: '#0f172a', letterSpacing: '0.5px' }}>GreenBox © 2026</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
