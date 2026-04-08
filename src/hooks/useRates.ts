import { useState, useEffect, useRef, useMemo } from 'react';
import { format } from 'date-fns';

export interface Rates {
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

export interface HistoryPoint {
  time: string;
  usdParallel: number;
  usdOfficial: number;
  ratesParallel?: Record<string, number>;
  ratesOfficial?: Record<string, number>;
}

export function useRates(autoRefreshEnabled: boolean, dataSaver: boolean) {
  const [rates, setRates] = useState<Rates | null>(null);
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastFetchTime, setLastFetchTime] = useState<Date | null>(null);
  const [onlineCount, setOnlineCount] = useState<number>(1);
  const [appStatus, setAppStatus] = useState<{ status: string; minutesSinceLastScrape: number } | null>(null);
  const [configTerms, setConfigTerms] = useState<any[]>([]);

  const ratesRef = useRef<Rates | null>(null);
  const lastNotifiedRef = useRef<Record<string, number>>({});

  useEffect(() => {
    ratesRef.current = rates;
  }, [rates]);

  const fetchConfig = async () => {
    try {
      const response = await fetch(`/api/config?t=${Date.now()}`);
      const data = await response.json();
      if (data && data.terms) {
        setConfigTerms(data.terms);
      }
    } catch (error) {
      console.error("Failed to fetch config:", error);
    }
  };

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
      
      if (ratesResult.status === 'fulfilled' && ratesResult.value.ok) {
        const newRates: Rates = await ratesResult.value.json();
        setRates(newRates);
        localStorage.setItem('lyd_rates', JSON.stringify(newRates));
      }

      if (historyResult.status === 'fulfilled' && historyResult.value.ok) {
        const newHistory = await historyResult.value.json();
        setHistory(newHistory);
        localStorage.setItem('lyd_history', JSON.stringify(newHistory));
      }

      setLastFetchTime(new Date());

      const statusRes = await fetch("/api/status");
      if (statusRes.ok) {
        setAppStatus(await statusRes.json());
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchConfig();
    fetchData();
    
    // WebSocket logic
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
    let socket: WebSocket | null = new WebSocket(wsUrl);

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'online_count') setOnlineCount(data.count);
      if (data.type === 'rates_update') setRates(data.rates);
    };

    return () => socket?.close();
  }, []);

  useEffect(() => {
    if (!autoRefreshEnabled) return;
    const interval = setInterval(fetchData, dataSaver ? 60000 : 10000);
    return () => clearInterval(interval);
  }, [autoRefreshEnabled, dataSaver]);

  return {
    rates,
    history,
    loading,
    isRefreshing,
    lastFetchTime,
    onlineCount,
    appStatus,
    configTerms,
    fetchData
  };
}
