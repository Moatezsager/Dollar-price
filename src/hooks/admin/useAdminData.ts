import { useState, useEffect } from 'react';
import { logErrorToServer } from '../../utils/logger';

export interface AdminStats {
  onlineUsers: number;
  lastSuccessfulScrape: string;
  minutesSinceLastScrape: number;
  channelsCount: number;
  termsCount: number;
  serverUptime: number;
  serverStartTime: string;
  dbConnected?: boolean;
  memoryUsage: { rss: number; heapUsed: number; heapTotal: number };
  dbStats?: {
    parallelRatesCount: number;
    officialRatesCount: number;
    errorLogsCount: number;
    priceChangesCount: number;
  };
}

export function useAdminData(token: string) {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [recentChanges, setRecentChanges] = useState<any[]>([]);
  const [apiStatsData, setApiStatsData] = useState<any>(null);
  const [liveFeed, setLiveFeed] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'online' | 'offline' | 'checking'>('checking');

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

  const fetchStats = async () => {
    if (!token) return;
    try {
      const res = await fetchWithTimeout("/api/admin/stats", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
        setConnectionStatus('online');
      } else {
        setConnectionStatus('offline');
      }
    } catch (err) {
      setConnectionStatus('offline');
    }
  };

  const fetchLogs = async () => {
    if (!token) return;
    try {
      const res = await fetchWithTimeout("/api/admin/error-logs", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setLogs(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      logErrorToServer(err, "useAdminData: fetchLogs");
    }
  };

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

  const fetchApiStats = async () => {
    if (!token) return;
    try {
      const res = await fetchWithTimeout("/api/admin/api-stats", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setApiStatsData(data);
      }
    } catch (err) {
      console.error("Failed to fetch API stats", err);
    }
  };

  const fetchLiveFeed = async (isPaused: boolean = false) => {
    if (!token || isPaused) return;
    try {
      const res = await fetchWithTimeout("/api/admin/live-feed", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setLiveFeed(data.feed || []);
      }
    } catch (err) {
      console.warn("Live feed fetch failed");
    }
  };

  const fetchAll = async () => {
    if (!token) return;
    setLoading(true);
    await Promise.all([
      fetchStats(),
      fetchLogs(),
      fetchRecentChanges(),
      fetchApiStats(),
      fetchLiveFeed()
    ]);
    setLoading(false);
  };

  useEffect(() => {
    if (token) {
      fetchAll();
      const interval = setInterval(fetchStats, 10000);
      return () => clearInterval(interval);
    }
  }, [token]);

  return {
    stats,
    logs,
    recentChanges,
    apiStatsData,
    liveFeed,
    loading,
    connectionStatus,
    fetchAll,
    fetchStats,
    fetchLogs,
    fetchRecentChanges,
    fetchApiStats,
    fetchLiveFeed
  };
}
