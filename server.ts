import "dotenv/config";
import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import { createClient } from '@supabase/supabase-js';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { TelegramClient, Api } from "telegram";
import { StringSession } from "telegram/sessions";
import { getTelegramClient, fetchChannelMessages, initializeTelegram, activeClient, TelegramManager, getTelegramManager } from "./telegramClient";

// Initialize Supabase client for server
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY; 

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("WARNING: Supabase credentials missing from environment variables.");
}

// Only create client if credentials are provided
const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

const serverStartTime = new Date();

interface RateMap {
  [key: string]: number;
}

interface LastChangedMap {
  [key: string]: string;
}

interface Rates {
  official: RateMap;
  parallel: RateMap;
  previousOfficial: RateMap;
  previousParallel: RateMap;
  lastUpdated: string;
  lastChanged: {
    official: LastChangedMap;
    parallel: LastChangedMap;
  };
}

interface HistoryPoint {
  time: string;
  usdParallel: number;
  usdOfficial: number;
  ratesParallel?: RateMap;
  ratesOfficial?: RateMap;
}

interface AppConfig {
  channels: string[];
  terms: {
    id: string;
    name: string;
    regex: string;
    min: number;
    max: number;
    isInverse: boolean;
    flag: string;
  }[];
  telegramApiId?: number;
  telegramApiHash?: string;
  telegramSessionString?: string;
  enableHttpScraper?: boolean;
  apiConfig?: {
    enabled: boolean;
    rateLimitWindowMs: number;
    rateLimitMaxRequests: number;
    banDurationMinutes: number;
  };
}

// Arabic Logging Utility
async function logErrorArabic(message: string, context = "النظام", stack?: string, url?: string) {
  if (!supabase || !supabaseAnonKey || supabaseAnonKey.includes('dummy')) {
    console.error(`[ArabicLog] ${context}: ${message}`);
    return;
  }
  
  try {
    const { error } = await supabase.from('error_logs').insert([{
      message: message,
      context: context,
      stack: stack,
      url: url,
      created_at: new Date().toISOString()
    }]);
    
    if (error) console.error("Failed to save Arabic error log:", error.message);
  } catch (err) {
    console.error("Critical error in logErrorArabic:", err);
  }
}

let rates: Rates = {
  official: {
    USD: 4.85,
    EUR: 5.25,
    GBP: 6.15,
    TND: 1.55,
    TRY: 0.15,
    EGP: 0.10,
    JOD: 6.85,
    AED: 1.32,
    SAR: 1.29,
    BHD: 12.85,
    KWD: 15.80,
    QAR: 1.33,
    CNY: 0.68,
  },
  parallel: {
    USD: 10.80,
    OFFICIAL_USD: 4.85,
    USD_CHECKS: 11.60,
    EUR: 12.17,
    GBP: 13.80,
    GOLD: 485,
    USD_TR: 10.85,
    USD_AE: 10.82,
    USD_CN: 10.90,
    GOLD_EXT_18: 495,
    GOLD_EXT_21: 580,
    GOLD_SCRAP_18: 485,
    GOLD_SCRAP_21: 565,
    GOLD_CAST_18: 490,
    GOLD_CAST_24: 575,
    GOLD_LIRA_8G: 4150,
    GOLD_MUJARA_14G: 8250,
    SILVER_CAST_1000: 23.50,
    SILVER_SCRAP: 18.50,
    TND: 3.33,
    TRY: 0.24,
    EGP: 0.20,
    JOD: 15.15,
    BHD: 28.60,
    KWD: 35.10,
    AED: 2.95,
    SAR: 2.88,
    QAR: 2.96,
    USD_JBANK: 11.60,
    USD_BCD: 11.62,
    USD_NCB: 11.60,
    USD_AB: 11.60,
    USD_WB: 11.62,
  },
  previousOfficial: {
    USD: 4.85,
    EUR: 5.25,
    GBP: 6.15,
    TND: 1.55,
    TRY: 0.15,
    EGP: 0.10,
    JOD: 6.85,
    AED: 1.32,
    SAR: 1.29,
    BHD: 12.85,
    KWD: 15.80,
    QAR: 1.33,
    CNY: 0.68,
  },
  previousParallel: {
    USD: 10.75,
    OFFICIAL_USD: 4.85,
    USD_CHECKS: 11.55,
    EUR: 12.10,
    GBP: 13.75,
    GOLD: 480,
    USD_TR: 10.80,
    USD_AE: 10.80,
    USD_CN: 10.85,
    GOLD_EXT_18: 490,
    GOLD_EXT_21: 575,
    GOLD_SCRAP_18: 480,
    GOLD_SCRAP_21: 560,
    GOLD_CAST_18: 485,
    GOLD_CAST_24: 570,
    GOLD_LIRA_8G: 4100,
    GOLD_MUJARA_14G: 8200,
    SILVER_CAST_1000: 23.40,
    SILVER_SCRAP: 18.40,
    TND: 3.30,
    TRY: 0.23,
    EGP: 0.19,
    JOD: 15.10,
    BHD: 28.50,
    KWD: 35.00,
    AED: 2.90,
    SAR: 2.85,
    QAR: 2.90,
    CNY: 0.90,
    USD_JBANK: 11.55,
    USD_BCD: 11.58,
    USD_NCB: 11.55,
    USD_AB: 11.55,
    USD_WB: 11.58,
  },
  lastUpdated: new Date().toISOString(),
  lastChanged: {
    official: {},
    parallel: {},
  },
};

// Initialize lastChanged with current time
Object.keys(rates.official).forEach(key => rates.lastChanged.official[key] = rates.lastUpdated);
Object.keys(rates.parallel).forEach(key => rates.lastChanged.parallel[key] = rates.lastUpdated);

// History for the chart (fallback if Supabase fails)
let history: HistoryPoint[] = [];
const now = new Date();
for (let i = 24; i >= 0; i--) {
  const time = new Date(now.getTime() - i * 60 * 60 * 1000);
  history.push({
    time: time.toISOString(),
    usdParallel: 7.30,
    usdOfficial: 4.85,
  });
}

const METAL_IDS = [
  "GOLD", 
  "GOLD_EXT_18", 
  "GOLD_EXT_21", 
  "GOLD_SCRAP_18", 
  "GOLD_SCRAP_21", 
  "GOLD_CAST_18", 
  "GOLD_CAST_24", 
  "GOLD_LIRA_8G", 
  "GOLD_MUJARA_14G", 
  "SILVER_CAST_1000"
];

// Helper to detect significant price changes (ignores tiny floating point noise)
function isSignificantChange(val1: number, val2: number, threshold = 0.0001) {
  return Math.abs((val1 || 0) - (val2 || 0)) > threshold;
}

// Helper to detect if a number is likely part of a date or time (e.g. 2024, 21-03, 12/05, 15:48)
function isProbablyDateOrTime(text: string, matchIndex: number, matchValue: string): boolean {
  // Look at context around the match
  const contextBefore = text.substring(Math.max(0, matchIndex - 10), matchIndex);
  const contextAfter = text.substring(matchIndex + matchValue.length, Math.min(text.length, matchIndex + matchValue.length + 10));
  
  // Date patterns: YYYY (starting with 20), DD/MM, DD-MM
  if (/^20\d{2}$/.test(matchValue)) return true; // Year 20XX
  
  // If the match has a decimal point or is too long, it's probably not a date/time component
  if (matchValue.includes('.') || matchValue.includes(',') || matchValue.length > 4) {
    return false;
  }

  if (/[/-]\d{1,2}$/.test(contextBefore) || /[/-]$/.test(contextBefore)) return true; // Matches -MM or /MM or just - before
  if (/^\d{1,2}[/-]/.test(contextAfter) || /^[/-]/.test(contextAfter)) return true; // Matches MM- or MM/ or just - after
  
  // Time patterns: HH:MM
  if (/^:\d{2}/.test(contextAfter)) return true; // Matches :MM after
  if (/\d{2}:$/.test(contextBefore) || /:$/.test(contextBefore)) return true; // Matches HH: or just : before
  
  // Also check if preceded by keywords like "بتاريخ" or "يوم" or "الساعة"
  if (/بتاريخ|يوم|سنة|عام|الساعة|ساعة/i.test(contextBefore)) return true;

  return false;
}



interface PriceChangeLog {
  id: string;
  currencyCode: string;
  currencyName: string;
  oldPrice: number;
  newPrice: number;
  source: string;
  timestamp: string;
}

const recentChangesLog: PriceChangeLog[] = [];

async function logPriceChange(change: PriceChangeLog) {
  recentChangesLog.unshift(change);
  if (recentChangesLog.length > 200) recentChangesLog.pop();

  if (supabase && supabaseAnonKey && !supabaseAnonKey.includes('dummy')) {
    try {
      await supabase.from('price_changes_log').insert([{
        id: change.id,
        currency_code: change.currencyCode,
        currency_name: change.currencyName,
        old_price: change.oldPrice,
        new_price: change.newPrice,
        source: change.source,
        created_at: change.timestamp
      }]);
    } catch (e) {
      console.error("Failed to insert price change log to Supabase", e);
    }
  }
}

/**
 * Synchronizes check rates (USD_CHECKS, USD_JBANK, USD_NCB)
 * As requested: Dollar (Checks) = Republic or Commercial check rate.
 * And vice versa: updating any one updates the others.
 */
async function syncCheckRates(source: string = "تزامن تلقائي") {
  const checkIds = ["USD_CHECKS", "USD_JBANK", "USD_NCB"];
  let latestCheckPrice = 0;
  let latestCheckTime = 0;

  // Find the most recently updated check price among the group
  for (const id of checkIds) {
    const lastChanged = rates.lastChanged.parallel[id];
    if (lastChanged) {
      const time = new Date(lastChanged).getTime();
      if (time > latestCheckTime) {
        latestCheckTime = time;
        latestCheckPrice = rates.parallel[id];
      }
    }
  }

  // If we found a valid check price, sync all of them in the group
  if (latestCheckPrice > 0) {
    let anyChanged = false;
    for (const id of checkIds) {
      if (rates.parallel[id] !== latestCheckPrice) {
        const oldVal = rates.parallel[id] || latestCheckPrice;
        
        // Update memory state
        rates.previousParallel[id] = oldVal;
        rates.parallel[id] = latestCheckPrice;
        rates.lastChanged.parallel[id] = new Date(latestCheckTime).toISOString();
        anyChanged = true;
        
        // Log the change for audit
        const term = appConfig.terms.find(t => t.id === id);
        const changeLog = {
          id: Math.random().toString(36).substring(2, 9),
          currencyCode: id,
          currencyName: term ? term.name : id,
          oldPrice: oldVal,
          newPrice: latestCheckPrice,
          source: `${source} (مزامنة الصكوك)`,
          timestamp: new Date().toISOString()
        };
        await logPriceChange(changeLog);
        console.log(`[Sync] Synced ${id} to ${latestCheckPrice} from check group. Source: ${source}`);
      }
    }
    return anyChanged;
  }
  return false;
}

let lastRatesFetchTime = 0;
const RATES_CACHE_TTL = 30 * 1000; // 30 seconds

// Initialize rates from Database on startup to ensure accuracy
async function initializeRatesFromDB(force = false) {
  if (!force && Date.now() - lastRatesFetchTime < RATES_CACHE_TTL) {
    return; // Use memory cache
  }

  if (!supabase || !supabaseAnonKey || supabaseAnonKey.includes('dummy')) return;
  
  try {
    // 1. Fetch latest parallel rates
    const { data: parallelData, error: parallelError } = await supabase
      .from('parallel_rates')
      .select('*')
      .order('recorded_at', { ascending: false })
      .limit(50);

    // 2. Fetch latest official rates
    const { data: officialData, error: officialError } = await supabase
      .from('official_rates')
      .select('*')
      .order('recorded_at', { ascending: false })
      .limit(50);

    // Check for errors (ignore table not found errors during migration)
    const isParallelTableMissing = parallelError && parallelError.message.includes('relation "parallel_rates" does not exist');
    const isOfficialTableMissing = officialError && officialError.message.includes('relation "official_rates" does not exist');

    if (isParallelTableMissing || isOfficialTableMissing) {
      console.warn("[DB] New tables missing, falling back to legacy exchange_rates table");
      const { data, error } = await supabase
        .from('exchange_rates')
        .select('*')
        .order('recorded_at', { ascending: false })
        .limit(50);
        
      if (!error && data && data.length > 0) {
        const latestRow = data[0];
        if (latestRow.rates_parallel) rates.parallel = { ...rates.parallel, ...latestRow.rates_parallel };
        if (latestRow.rates_official) rates.official = { ...rates.official, ...latestRow.rates_official };
        if (latestRow.last_changed) {
          rates.lastChanged = {
            official: { ...rates.lastChanged.official, ...(latestRow.last_changed.official || {}) },
            parallel: { ...rates.lastChanged.parallel, ...(latestRow.last_changed.parallel || {}) }
          };
        }
        rates.lastUpdated = latestRow.recorded_at || new Date().toISOString();
        
        const findPrev = (curr: RateMap, isP: boolean) => {
          const prev: RateMap = { ...curr };
          for (const code in curr) {
            const diff = data.find((row: any) => {
              const r = isP ? row.rates_parallel : row.rates_official;
              return r && isSignificantChange(r[code], curr[code]);
            });
            if (diff) {
              const r = isP ? (diff as any).rates_parallel : (diff as any).rates_official;
              prev[code] = r[code];
            }
          }
          return prev;
        };
        rates.previousParallel = findPrev(rates.parallel, true);
        rates.previousOfficial = findPrev(rates.official, false);
      }
    } else {
      // Use new tables
      if (parallelData && parallelData.length > 0) {
        const latest = parallelData[0];
        if (latest.rates) rates.parallel = { ...rates.parallel, ...latest.rates };
        if (latest.last_changed) rates.lastChanged.parallel = { ...rates.lastChanged.parallel, ...latest.last_changed };
        rates.lastUpdated = latest.recorded_at;
        
        // Find previous parallel
        for (const code in rates.parallel) {
          const diff = parallelData.find(r => r.rates && isSignificantChange(r.rates[code], rates.parallel[code]));
          if (diff) rates.previousParallel[code] = diff.rates[code];
        }
      }

      if (officialData && officialData.length > 0) {
        const latest = officialData[0];
        if (latest.rates) rates.official = { ...rates.official, ...latest.rates };
        // Find previous official
        for (const code in rates.official) {
          const diff = officialData.find(r => r.rates && isSignificantChange(r.rates[code], rates.official[code]));
          if (diff) rates.previousOfficial[code] = diff.rates[code];
        }
        // Update combined time if officially newer
        if (new Date(latest.recorded_at) > new Date(rates.lastUpdated)) {
           rates.lastUpdated = latest.recorded_at;
        }
      }
    }
    
    lastRatesFetchTime = Date.now();
    console.log(`[DB] Successfully loaded state from separated tables (Parallel USD: ${rates.parallel.USD})`);
  } catch (err) {
    console.error("Error initializing rates from DB:", err);
  }
}

async function saveToSupabase(type: 'parallel' | 'official' | 'both' = 'both') {
  if (!supabase || !supabaseAnonKey || supabaseAnonKey.includes('dummy')) return; 
  
  try {
    const results = [];
    
    // 1. Save Parallel Rates if needed
    if (type === 'parallel' || type === 'both') {
      if (rates.parallel.USD >= 5.5) {
        results.push(supabase.from('parallel_rates').insert([{
          usd: rates.parallel.USD,
          rates: rates.parallel,
          last_changed: rates.lastChanged.parallel,
          recorded_at: rates.lastUpdated
        }]));
      }
    }
    
    // 2. Save Official Rates if needed
    if (type === 'official' || type === 'both') {
      if (rates.official.USD > 0) {
        results.push(supabase.from('official_rates').insert([{
          usd: rates.official.USD,
          rates: rates.official,
          recorded_at: new Date().toISOString()
        }]));
      }
    }

    // 3. Save Metal Rates if needed
    if (type === 'parallel' || type === 'both') {
      const metalRates: Record<string, number> = {};
      const metalChanges: Record<string, string> = {};
      let hasMetals = false;
      
      METAL_IDS.forEach(id => {
        if (rates.parallel[id]) {
          metalRates[id] = rates.parallel[id];
          metalChanges[id] = rates.lastChanged.parallel[id];
          hasMetals = true;
        }
      });

      if (hasMetals) {
        results.push(supabase.from('metal_rates').insert([{
          rates: metalRates,
          last_changed: metalChanges,
          recorded_at: rates.lastUpdated
        }]));
      }
    }

    // 4. Fallback: Save to legacy table for backward compatibility during transition
    const legacyRecord = { 
      usd_parallel: rates.parallel.USD, 
      usd_official: rates.official.USD,
      rates_parallel: rates.parallel,
      rates_official: rates.official,
      previous_parallel: rates.previousParallel,
      previous_official: rates.previousOfficial,
      last_changed: rates.lastChanged,
      recorded_at: rates.lastUpdated
    };
    results.push(supabase.from('exchange_rates').insert([legacyRecord]));

    const settled = await Promise.allSettled(results);
    
    // Log errors but don't crash (some tables might not exist yet)
    settled.forEach((res, i) => {
      if (res.status === 'rejected') {
        console.error(`Save error for source ${i}:`, res.reason);
      }
    });

    // Cleanup old records from ALL tables (maintenance)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const cutoff = thirtyDaysAgo.toISOString();
    
    await Promise.allSettled([
      supabase.from('parallel_rates').delete().lt('recorded_at', cutoff),
      supabase.from('official_rates').delete().lt('recorded_at', cutoff),
      supabase.from('exchange_rates').delete().lt('recorded_at', cutoff)
    ]);
        
    // Invalidate caches
    cachedHistory = null;
    lastHistoryFetchTime = 0;
    lastRatesFetchTime = 0;
    
    // Log success in Arabic
    const typeLabel = type === 'parallel' ? 'سوق موازي' : type === 'official' ? 'رسمي' : 'متكامل';
    console.log(`[DB] Successfully saved ${typeLabel} rates to database`);
  } catch (err) {
    console.error("Supabase unified save error:", err);
    await logErrorArabic(`فشل حفظ البيانات في قاعدة البيانات: ${type === 'parallel' ? 'موازي' : 'رسمي'}`, "حفظ البيانات", String(err));
  }
}

let cachedHistory: HistoryPoint[] | null = null;
let lastHistoryFetchTime = 0;
const HISTORY_CACHE_TTL = 60 * 1000; // 1 minute

async function fetchHistoryFromSupabase() {
  if (cachedHistory && Date.now() - lastHistoryFetchTime < HISTORY_CACHE_TTL) {
    return cachedHistory;
  }

  if (!supabase || !supabaseAnonKey || supabaseAnonKey.includes('dummy')) return history;
  
  try {
    // Fetch parallel, official and metal history in parallel for speed
    const [parallelRes, officialRes, metalRes] = await Promise.all([
      supabase.from('parallel_rates').select('recorded_at, usd, rates').order('recorded_at', { ascending: false }).limit(3000),
      supabase.from('official_rates').select('recorded_at, usd, rates').order('recorded_at', { ascending: false }).limit(3000),
      supabase.from('metal_rates').select('recorded_at, rates').order('recorded_at', { ascending: false }).limit(3000)
    ]);

    // Check for "table not found" errors - fallback to legacy if tables are missing
    if (parallelRes.error?.message.includes('relation "parallel_rates" does not exist') || 
        officialRes.error?.message.includes('relation "official_rates" does not exist')) {
        
        const { data, error } = await supabase.from('exchange_rates').select('*').order('recorded_at', { ascending: false }).limit(3000);
        if (!error && data) {
           cachedHistory = data.reverse().map((row: any) => ({
              time: row.recorded_at,
              usdParallel: row.usd_parallel || (row.rates_parallel ? row.rates_parallel.USD : 0),
              usdOfficial: row.usd_official || (row.rates_official ? row.rates_official.USD : 0),
              ratesParallel: row.rates_parallel || { USD: row.usd_parallel },
              ratesOfficial: row.rates_official || { USD: row.usd_official },
              previousParallel: row.previous_parallel,
              previousOfficial: row.previous_official
           })).filter((item: any) => item.usdParallel > 5.5 || item.usdOfficial > 0);
           lastHistoryFetchTime = Date.now();
           return cachedHistory;
        }
        return history;
    }

    const parallelData = parallelRes.data || [];
    const officialData = officialRes.data || [];
    const metalData = metalRes.data || [];

    // Merge strategy: We want a continuous timeline. 
    // Since parallel, official and metal points might not align in time, we create a unified map of timestamps
    const timelineMap = new Map<string, Partial<HistoryPoint>>();

    parallelData.forEach((row: any) => {
      const time = new Date(row.recorded_at).toISOString();
      timelineMap.set(time, {
        time,
        usdParallel: row.usd,
        ratesParallel: row.rates || { USD: row.usd }
      });
    });

    officialData.forEach((row: any) => {
      const time = new Date(row.recorded_at).toISOString();
      if (timelineMap.has(time)) {
        const existing = timelineMap.get(time)!;
        existing.usdOfficial = row.usd;
        existing.ratesOfficial = row.rates || { USD: row.usd };
      } else {
        timelineMap.set(time, {
          time,
          usdOfficial: row.usd,
          ratesOfficial: row.rates || { USD: row.usd }
        });
      }
    });

    metalData.forEach((row: any) => {
      const time = new Date(row.recorded_at).toISOString();
      if (timelineMap.has(time)) {
        const existing = timelineMap.get(time)!;
        existing.ratesParallel = { ...(existing.ratesParallel || {}), ...(row.rates || {}) };
      } else {
        timelineMap.set(time, {
          time,
          ratesParallel: row.rates || {}
        });
      }
    });

    // Sort by time and fill gaps (e.g. if a parallel point has no official data, use the closest previous official)
    const sortedPoints = Array.from(timelineMap.values()).sort((a, b) => 
      new Date(a.time!).getTime() - new Date(b.time!).getTime()
    );

    let lastParallelRates: any = { ...rates.parallel };
    let lastOfficialRates: any = { ...rates.official };
    let lastUsdParallel = rates.parallel.USD || 0;
    let lastUsdOfficial = rates.official.USD || 0;
    
    // Fill gaps by carrying forward values
    const completedHistory = sortedPoints.map(p => {
      if (p.usdParallel !== undefined) lastUsdParallel = p.usdParallel;
      if (p.usdOfficial !== undefined) lastUsdOfficial = p.usdOfficial;
      if (p.ratesParallel) lastParallelRates = { ...lastParallelRates, ...p.ratesParallel };
      if (p.ratesOfficial) lastOfficialRates = { ...lastOfficialRates, ...p.ratesOfficial };
      
      return {
        time: p.time!,
        usdParallel: lastUsdParallel,
        usdOfficial: lastUsdOfficial,
        ratesParallel: { ...lastParallelRates },
        ratesOfficial: { ...lastOfficialRates }
      };
    }) as HistoryPoint[];

    if (completedHistory.length > 0) {
      cachedHistory = completedHistory;
      lastHistoryFetchTime = Date.now();
      return cachedHistory;
    }
  } catch (err) {
    console.error("Error fetching history from separated tables:", err);
  }
  return history;
}

// Fetch official rates from Central Bank of Libya website

async function fetchFromCBL(): Promise<RateMap | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    // Use the specific exchange rates page which is more reliable than the homepage
    const response = await fetch('https://cbl.gov.ly/currency-exchange-rates/', { 
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    clearTimeout(timeoutId);
    
    if (!response.ok) return null;
    const html = await response.text();
    
    const currencies = [
      { id: "USD", names: ["الدولار الأمريكي", "USD"] },
      { id: "EUR", names: ["اليورو", "EUR", "EURO"] },
      { id: "GBP", names: ["الجنيه الإسترليني", "GBP", "STIRLING", "الجنيه الاسترليني"] },
      { id: "TND", names: ["الدينار التونسي", "TND"] },
      { id: "TRY", names: ["الليرة التركية", "TRY"] },
      { id: "SAR", names: ["الريال السعودي", "SAR"] },
      { id: "AED", names: ["الدرهم الإماراتي", "AED", "الدرهم الاماراتي"] },
      { id: "CNY", names: ["الايوان الصيني", "اليوان الصيني", "CNY"] },
      { id: "CAD", names: ["الدولار الكندي", "CAD"] },
    ];

    const results: RateMap = {};
    
    // Split by rows to ensure we only match numbers within the correct row
    const rows = html.split(/<tr[^>]*>/i);
    
    for (const currency of currencies) {
      for (const name of currency.names) {
        // Find the specific row containing this currency name
        const targetRow = rows.find(row => row.includes(name));
        if (targetRow) {
          // Extract the "Selling Price" (بيع) rate as per user request
          // Looking for the number after the "بيع:" span
          const rateMatch = targetRow.match(/بيع:\s*<\/span>\s*([\d.]+)/i);
          if (rateMatch && rateMatch[1]) {
            const val = parseFloat(rateMatch[1]);
            if (!isNaN(val) && val > 0) {
              results[currency.id] = val;
              break; 
            }
          }
        }
      }
    }

    if (results.USD && results.USD > 4.0 && results.USD < 8.0) {
      console.log(`[CBL Scraper] Successfully extracted ${Object.keys(results).length} rates from CBL website (USD: ${results.USD})`);
      return results;
    }
    console.warn("[CBL Scraper] Could not find valid USD rate in the HTML");
    await logErrorArabic("فشل استخراج الدولار من موقع المصرف المركزي - قد يكون الهيكل تغير", "مصرف ليبيا المركزي");
    return null;
  } catch (err) {
    console.error("[CBL Scraper] Error scraping CBL website:", err);
    await logErrorArabic("خطأ تقني أثناء كشط موقع المصرف المركزي", "مصرف ليبيا المركزي", String(err));
    return null;
  }
}

// Fetch real official rates from open API
async function fetchOfficialRates(): Promise<boolean> {
  console.log("[Official] Starting official rates fetch cycle...");
  // 1. Try CBL Website First (Most Accurate for Libya)
  const cblRates = await fetchFromCBL();
  if (cblRates) {
    let anyChanged = false;
    Object.entries(cblRates).forEach(([key, val]) => {
      if (isSignificantChange(rates.official[key], val)) {
        rates.previousOfficial[key] = rates.official[key];
        rates.lastChanged.official[key] = new Date().toISOString();
        anyChanged = true;
      }
    });

    if (anyChanged) {
      rates.official = { ...rates.official, ...cblRates };
      rates.parallel.OFFICIAL_USD = rates.official.USD;
      rates.lastChanged.parallel.OFFICIAL_USD = new Date().toISOString();
      console.log(`[Official] Rates updated via CBL Scraper`);
    }
    return anyChanged;
  }

  const ffKey = process.env.FAST_FOREX_KEY;
  
  if (!ffKey) {
    console.warn("[Official] FastForex Key missing, skipping premium source");
  } else {
    // Try FastForex (Secondary)
    try {
      const ffResponse = await fetch(`https://api.fastforex.io/fetch-all?from=USD&api_key=${ffKey}`);
      const ffData = await ffResponse.json();
      
      if (ffData && ffData.results && ffData.results.LYD) {
        let anyChanged = false;
        const lyd = ffData.results.LYD;
        const res = ffData.results;
        
        const newOfficial: RateMap = {
          USD: lyd,
          EUR: lyd / (res.EUR || 1),
          GBP: lyd / (res.GBP || 1),
          TND: lyd / (res.TND || 1),
          TRY: lyd / (res.TRY || 1),
          EGP: lyd / (res.EGP || 1),
          JOD: lyd / (res.JOD || 1),
          AED: lyd / (res.AED || 1),
          SAR: lyd / (res.SAR || 1),
          BHD: lyd / (res.BHD || 1),
          KWD: lyd / (res.KWD || 1),
          QAR: lyd / (res.QAR || 1),
          CNY: lyd / (res.CNY || 1),
        };

        Object.entries(newOfficial).forEach(([key, val]) => {
          if (isSignificantChange(rates.official[key], val)) {
            rates.previousOfficial[key] = rates.official[key];
            rates.lastChanged.official[key] = new Date().toISOString();
            anyChanged = true;
          }
        });
        
        if (anyChanged) {
          rates.official = { ...rates.official, ...newOfficial };
          rates.parallel.OFFICIAL_USD = rates.official.USD;
          rates.lastChanged.parallel.OFFICIAL_USD = new Date().toISOString();
          console.log(`[Official] Rates updated via FastForex`);
        }
        return anyChanged;
      }
    } catch (e) {
      console.warn("[Official] FastForex failed, falling back to public APIs");
    }
  }

  // Fallback to free public APIs
  const sources = [
    "https://api.exchangerate-api.com/v4/latest/USD",
    "https://open.er-api.com/v6/latest/USD"
  ];

  for (const source of sources) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      const response = await fetch(source, { signal: controller.signal });
      clearTimeout(timeoutId);
      
      const data = await response.json();
      
      if (data && data.rates && data.rates.LYD) {
        let anyChanged = false;
        const lyd = data.rates.LYD;
        
        const newOfficial: RateMap = {
          USD: lyd,
          EUR: lyd / (data.rates.EUR || 1),
          GBP: lyd / (data.rates.GBP || 1),
          TND: lyd / (data.rates.TND || 1),
          TRY: lyd / (data.rates.TRY || 1),
          EGP: lyd / (data.rates.EGP || 1),
          JOD: lyd / (data.rates.JOD || 1),
          AED: lyd / (data.rates.AED || 1),
          SAR: lyd / (data.rates.SAR || 1),
          BHD: lyd / (data.rates.BHD || 1),
          KWD: lyd / (data.rates.KWD || 1),
          QAR: lyd / (data.rates.QAR || 1),
          CNY: lyd / (data.rates.CNY || 1),
        };

        Object.entries(newOfficial).forEach(([key, val]) => {
          if (isSignificantChange(rates.official[key], val)) {
            rates.previousOfficial[key] = rates.official[key];
            rates.lastChanged.official[key] = new Date().toISOString();
            anyChanged = true;
          }
        });
        
        if (anyChanged) {
          rates.official = { ...rates.official, ...newOfficial };
          rates.parallel.OFFICIAL_USD = rates.official.USD;
          rates.lastChanged.parallel.OFFICIAL_USD = new Date().toISOString();
          console.log(`Official rates updated via ${source}`);
        }
        return anyChanged;
      }
    } catch (error) {
      console.error(`Error fetching official rates from ${source}:`, error);
    }
  }
  return false;
}

// Dynamic Configuration
// Dynamic Configuration
let appConfig: AppConfig = {
  channels: ["dollarr_ly", "musheermarket", "lydollar", "djheih2026", "suqalmushir"],
  enableHttpScraper: true,
  apiConfig: {
    enabled: true,
    rateLimitWindowMs: 60000,
    rateLimitMaxRequests: 20,
    banDurationMinutes: 5,
  },
  terms: [
    { id: "USD", name: "دولار أمريكي", regex: "(?:USD|usd|الدولار|دولار|الخضراء|خضراء|كاش|💵|🇺🇸)(?!\\s*صكوك|\\s*بصك|\\s*شيك)[^\\d]{0,40}(\\d{1,2}(?:[\\.,]\\d{1,4})?)(?:\\s+(?:بيع|شراء)?[^\\d]{0,15}(\\d{1,2}(?:[\\.,]\\d{1,4})?))?", min: 5.0, max: 25.0, isInverse: false, flag: "us" },
    { id: "EUR", name: "يورو", regex: "(?:EUR|eur|يورو|اليورو|💶|🇪🇺)[^\\d]{0,40}(\\d{1,2}(?:[\\.,]\\d{1,4})?)(?:\\s+(?:بيع|شراء)?[^\\d]{0,15}(\\d{1,2}(?:[\\.,]\\d{1,4})?))?", min: 5.0, max: 25.0, isInverse: false, flag: "eu" },
    { id: "GBP", name: "جنيه إسترليني", regex: "(?:GBP|gbp|باوند|استرليني|الباوند|💷|🇬🇧)[^\\d]{0,40}(\\d{1,2}(?:[\\.,]\\d{1,4})?)(?:\\s+(?:بيع|شراء)?[^\\d]{0,15}(\\d{1,2}(?:[\\.,]\\d{1,4})?))?", min: 5.0, max: 25.0, isInverse: false, flag: "gb" },
    { id: "TND", name: "دينار تونسي", regex: "(?:TND|tnd|تونسي|تونس(?![ا-ي])|🇹🇳)[^\\d]{0,40}(\\d{1,2}(?:[\\.,]\\d{1,4})?)(?:\\s+(?:بيع|شراء)?[^\\d]{0,15}(\\d{1,2}(?:[\\.,]\\d{1,4})?))?", min: 0.1, max: 10.0, isInverse: false, flag: "tn" },
    { id: "EGP", name: "جنيه مصري", regex: "(?:EGP|egp|مصري|مصر(?![ا-ي])|🇪🇬)[^\\d]{0,40}(\\d{1,2}(?:[\\.,]\\d{1,4})?)(?:\\s+(?:بيع|شراء)?[^\\d]{0,15}(\\d{1,2}(?:[\\.,]\\d{1,4})?))?", min: 0.01, max: 5.0, isInverse: false, flag: "eg" },
    { id: "TRY", name: "ليرة تركية", regex: "(?:TRY|try|ليرة(?!\\s*ذهب)|(?<!حوالة\\s*)(?<!حوالات\\s*)تركي(?![ا-ي])|🇹🇷)[^\\d]{0,40}(\\d{1,2}(?:[\\.,]\\d{1,4})?)(?:\\s+(?:بيع|شراء)?[^\\d]{0,15}(\\d{1,2}(?:[\\.,]\\d{1,4})?))?", min: 0.01, max: 5.0, isInverse: false, flag: "tr" },
    { id: "JOD", name: "دينار أردني", regex: "(?:JOD|jod|أردني|🇯🇴)[^\\d]{0,40}(\\d{1,2}(?:[\\.,]\\d{1,4})?)(?:\\s+(?:بيع|شراء)?[^\\d]{0,15}(\\d{1,2}(?:[\\.,]\\d{1,4})?))?", min: 5.0, max: 30.0, isInverse: false, flag: "jo" },
    { id: "BHD", name: "دينار بحريني", regex: "(?:BHD|bhd|بحريني|🇧🇭)[^\\d]{0,40}(\\d{1,2}(?:[\\.,]\\d{1,4})?)(?:\\s+(?:بيع|شراء)?[^\\d]{0,15}(\\d{1,2}(?:[\\.,]\\d{1,4})?))?", min: 10.0, max: 50.0, isInverse: false, flag: "bh" },
    { id: "KWD", name: "دينار كويتي", regex: "(?:KWD|kwd|كويتي|🇰🇼)[^\\d]{0,40}(\\d{1,2}(?:[\\.,]\\d{1,4})?)(?:\\s+(?:بيع|شراء)?[^\\d]{0,15}(\\d{1,2}(?:[\\.,]\\d{1,4})?))?", min: 10.0, max: 60.0, isInverse: false, flag: "kw" },
    { id: "AED", name: "درهم إماراتي", regex: "(?:AED|aed|إماراتي|امارات|🇦🇪)[^\\d]{0,40}(\\d{0,2}(?:[\\.,]\\d{1,4})?)(?:\\s+(?:بيع|شراء)?[^\\d]{0,15}(\\d{0,2}(?:[\\.,]\\d{1,4})?))?", min: 0.5, max: 10.0, isInverse: false, flag: "ae" },
    { id: "SAR", name: "ريال سعودي", regex: "(?:SAR|sar|سعودي|ريال|🇸🇦)[^\\d]{0,40}(\\d{0,2}(?:[\\.,]\\d{1,4})?)(?:\\s+(?:بيع|شراء)?[^\\d]{0,15}(\\d{0,2}(?:[\\.,]\\d{1,4})?))?", min: 0.5, max: 10.0, isInverse: false, flag: "sa" },
    { id: "QAR", name: "ريال قطري", regex: "(?:QAR|qar|قطري|🇶🇦)[^\\d]{0,40}(\\d{0,2}(?:[\\.,]\\d{1,4})?)(?:\\s+(?:بيع|شراء)?[^\\d]{0,15}(\\d{0,2}(?:[\\.,]\\d{1,4})?))?", min: 0.5, max: 10.0, isInverse: false, flag: "qa" },
    { id: "USD_JBANK", name: "صكوك الجمهورية", regex: "(?:jbank|الجمهورية|صكوك الجمهورية|بصك الجمهورية)[^\\d]{0,40}(\\d{1,2}(?:[\\.,]\\d{1,4})?)(?:\\s+(?:بيع|شراء)?[^\\d]{0,15}(\\d{1,2}(?:[\\.,]\\d{1,4})?))?", min: 5.0, max: 25.0, isInverse: false, flag: "us" },
    { id: "USD_BCD", name: "صكوك التجارة", regex: "(?:bcd|التجارة والتنمية|صكوك التجارة|بصك التجارة)[^\\d]{0,40}(\\d{1,2}(?:[\\.,]\\d{1,4})?)(?:\\s+(?:بيع|شراء)?[^\\d]{0,15}(\\d{1,2}(?:[\\.,]\\d{1,4})?))?", min: 5.0, max: 25.0, isInverse: false, flag: "us" },
    { id: "USD_NCB", name: "صكوك التجاري", regex: "(?:NCB|التجاري الوطني|صكوك التجاري|بصك التجاري)[^\\d]{0,40}(\\d{1,2}(?:[\\.,]\\d{1,4})?)(?:\\s+(?:بيع|شراء)?[^\\d]{0,15}(\\d{1,2}(?:[\\.,]\\d{1,4})?))?", min: 5.0, max: 25.0, isInverse: false, flag: "us" },
    { id: "USD_AB", name: "صكوك الأمان", regex: "(?:AB|الأمان|الامان|صكوك الأمان|صكوك الامان)[^\\d]{0,40}(\\d{1,2}(?:[\\.,]\\d{1,4})?)(?:\\s+(?:بيع|شراء)?[^\\d]{0,15}(\\d{1,2}(?:[\\.,]\\d{1,4})?))?", min: 5.0, max: 25.0, isInverse: false, flag: "us" },
    { id: "USD_WB", name: "صكوك الوحدة", regex: "(?:WB|الوحدة|صكوك الوحدة|بصك الوحدة)[^\\d]{0,40}(\\d{1,2}(?:[\\.,]\\d{1,4})?)(?:\\s+(?:بيع|شراء)?[^\\d]{0,15}(\\d{1,2}(?:[\\.,]\\d{1,4})?))?", min: 5.0, max: 25.0, isInverse: false, flag: "us" },
    { id: "USD_AE", name: "حوالات دبي", regex: "(?:دبي|امارات|الإمارات|حوالة دبي|حوالات دبي|🇦🇪)[^\\d]{0,40}(\\d{1,2}(?:[\\.,]\\d{1,4})?)(?:\\s+(?:بيع|شراء)?[^\\d]{0,15}(\\d{1,2}(?:[\\.,]\\d{1,4})?))?", min: 5.0, max: 25.0, isInverse: false, flag: "ae" },
    { id: "USD_TR", name: "حوالات تركيا", regex: "(?:تركيا|تركي|حوالة تركيا|حوالات تركيا|🇹🇷)[^\\d]{0,40}(\\d{1,2}(?:[\\.,]\\d{1,4})?)(?:\\s+(?:بيع|شراء)?[^\\d]{0,15}(\\d{1,2}(?:[\\.,]\\d{1,4})?))?", min: 5.0, max: 25.0, isInverse: false, flag: "tr" },
    { id: "USD_CN", name: "حوالات الصين", regex: "(?:الصين|صينية|حوالة الصين|حوالات الصين|🇨🇳)[^\\d]{0,40}(\\d{1,2}(?:[\\.,]\\d{1,4})?)(?:\\s+(?:بيع|شراء)?[^\\d]{0,15}(\\d{1,2}(?:[\\.,]\\d{1,4})?))?", min: 5.0, max: 25.0, isInverse: false, flag: "cn" },
    { id: "CNY", name: "يوان صيني", regex: "(?:CNY|cny|يوان|🇨🇳)[^\\d]{0,40}(\\d{1,2}(?:[\\.,]\\d{1,4})?)(?:\\s+(?:بيع|شراء)?[^\\d]{0,15}(\\d{1,2}(?:[\\.,]\\d{1,4})?))?", min: 0.5, max: 5.0, isInverse: false, flag: "cn" },
    { id: "GOLD_EXT_18", name: "ذهب خارجي 18", regex: "(?:ذهب خارجي 18|خارجي 18|عيار 18 خارجي|18 خارجي)[^\\d]{0,40}(\\d{2,4}(?:[\\.,]\\d+)?)(?:\\s+(?:بيع|شراء)?[^\\d]{0,15}(\\d{2,4}(?:[\\.,]\\d+)?))?", min: 100, max: 5000, isInverse: false, flag: "ly" },
    { id: "GOLD_EXT_21", name: "ذهب خارجي 21", regex: "(?:ذهب خارجي 21|خارجي 21|عيار 21 خارجي|21 خارجي)[^\\d]{0,40}(\\d{2,4}(?:[\\.,]\\d+)?)(?:\\s+(?:بيع|شراء)?[^\\d]{0,15}(\\d{2,4}(?:[\\.,]\\d+)?))?", min: 100, max: 5000, isInverse: false, flag: "ly" },
    { id: "GOLD_SCRAP_18", name: "ذهب كسر 18", regex: "(?:ذهب كسر 18|كسر 18|عيار 18 كسر|18 كسر)[^\\d]{0,40}(\\d{2,4}(?:[\\.,]\\d+)?)(?:\\s+(?:بيع|شراء)?[^\\d]{0,15}(\\d{2,4}(?:[\\.,]\\d+)?))?", min: 100, max: 5000, isInverse: false, flag: "ly" },
    { id: "GOLD_SCRAP_21", name: "ذهب كسر 21", regex: "(?:ذهب كسر 21|كسر 21|عيار 21 كسر|21 كسر)[^\\d]{0,40}(\\d{2,4}(?:[\\.,]\\d+)?)(?:\\s+(?:بيع|شراء)?[^\\d]{0,15}(\\d{2,4}(?:[\\.,]\\d+)?))?", min: 100, max: 5000, isInverse: false, flag: "ly" },
    { id: "GOLD_CAST_18", name: "ذهب مسبوك 18", regex: "(?:ذهب مسبوك 18|مسبوك 18|عيار 18 مسبوك|18 مسبوك)[^\\d]{0,40}(\\d{2,4}(?:[\\.,]\\d+)?)(?:\\s+(?:بيع|شراء)?[^\\d]{0,15}(\\d{2,4}(?:[\\.,]\\d+)?))?", min: 100, max: 5000, isInverse: false, flag: "ly" },
    { id: "GOLD_CAST_24", name: "ذهب مسبوك 24", regex: "(?:ذهب مسبوك 24|مسبوك 24|عيار 24 مسبوك|24 مسبوك)[^\\d]{0,40}(\\d{2,4}(?:[\\.,]\\d+)?)(?:\\s+(?:بيع|شراء)?[^\\d]{0,15}(\\d{2,4}(?:[\\.,]\\d+)?))?", min: 100, max: 5000, isInverse: false, flag: "ly" },
    { id: "GOLD_LIRA_8G", name: "ليرة ذهب 8 جرام", regex: "(?:ليرة ذهب 8 جرام|ليرة ذهب|ليرة 8 جرام|ليرة 8ج)[^\\d]{0,40}(\\d{2,5}(?:[\\.,]\\d+)?)(?:\\s+(?:بيع|شراء)?[^\\d]{0,15}(\\d{2,5}(?:[\\.,]\\d+)?))?", min: 1000, max: 20000, isInverse: false, flag: "ly" },
    { id: "GOLD_MUJARA_14G", name: "مجارة ذهب 14 جرام", regex: "(?:مجارة ذهب 14 جرام|مجارة 14 جرام|مجارة 14)[^\\d]{0,40}(\\d{2,5}(?:[\\.,]\\d+)?)(?:\\s+(?:بيع|شراء)?[^\\d]{0,15}(\\d{2,5}(?:[\\.,]\\d+)?))?", min: 1000, max: 35000, isInverse: false, flag: "ly" },
    { id: "GOLD", name: "كسر الذهب", regex: "(?:كسر الذهب|ذهبي|(?<!ليرة\\s*)(?<!مجارة\\s*)(?<!مسبوك\\s*)ذهب(?!\\s*كسر)(?!\\s*مسبوك)(?!\\s*خارجي)|💎)[^\\d]{0,40}(\\d{2,4}(?:[\\.,]\\d+)?)(?:\\s+(?:بيع|شراء)?[^\\d]{0,15}(\\d{2,4}(?:[\\.,]\\d+)?))?", min: 100, max: 5000, isInverse: false, flag: "ly" },
    { id: "SILVER_CAST_1000", name: "مسبوك فضة عيار 1000", regex: "(?:مسبوك فضة عيار 1000|مسبوك فضة 1000|فضة 1000)[^\\d]{0,40}(\\d{1,3}(?:[\\.,]\\d+)?)(?:\\s+(?:بيع|شراء)?[^\\d]{0,15}(\\d{1,3}(?:[\\.,]\\d+)?))?", min: 1, max: 500, isInverse: false, flag: "ly" },
    { id: "SILVER_SCRAP", name: "كسر فضة", regex: "(?:كسر فضة|كسر الفضة|فضة كسر)[^\\d]{0,40}(\\d{1,3}(?:[\\.,]\\d+)?)(?:\\s+(?:بيع|شراء)?[^\\d]{0,15}(\\d{1,3}(?:[\\.,]\\d+)?))?", min: 1, max: 500, isInverse: false, flag: "ly" },
    { id: "OFFICIAL_USD", name: "الدولار الرسمي", regex: "(?:الرسمي|المركزي)[^\\d]{0,40}(\\d{1,2}(?:[\\.,]\\d{1,4})?)", min: 4.0, max: 6.0, isInverse: false, flag: "us" }
  ]
};
let telegramManager: TelegramManager | null = null;

async function loadConfigFromSupabase() {
  if (!supabase || !supabaseAnonKey || supabaseAnonKey.includes('dummy')) return;
  try {
    const { data, error } = await supabase
      .from('app_config')
      .select('config')
      .eq('id', 1)
      .single();
      
    if (error) {
      if (error.code === 'PGRST116') {
        // Row doesn't exist, create it
        await supabase.from('app_config').insert([{ id: 1, config: appConfig }]);
      } else if (!error.message.includes('relation "app_config" does not exist')) {
        console.error("Error loading config from Supabase:", error);
      }
    } else if (data && data.config) {
      // Robust Merge & Repair Logic
      const dbConfig = data.config as AppConfig;
      
      // 1. Repair flags and missing fields for existing terms
      dbConfig.terms = dbConfig.terms.map(dbTerm => {
        const defaultTerm = appConfig.terms.find(t => t.id === dbTerm.id);
        if (defaultTerm) {
          // IMPORTANT: We override DB regex with Code regex to ensure bug fixes propagate!
          return {
            ...dbTerm,      // Start with DB values
            regex: defaultTerm.regex, // OVERRIDE with latest code regex
            min: defaultTerm.min,     // OVERRIDE with latest code constraints
            max: defaultTerm.max,     // OVERRIDE with latest code constraints
            name: dbTerm.name || defaultTerm.name,
            // Ensure flag is valid and not a string "undefined"/"null"
            flag: (dbTerm.flag && dbTerm.flag !== "undefined" && dbTerm.flag !== "null") ? dbTerm.flag : defaultTerm.flag
          };
        }
        return dbTerm;
      });

      // 2. Add entirely new terms that are in the code but not in the DB
      const existingIds = new Set(dbConfig.terms.map(t => t.id));
      for (const defaultTerm of appConfig.terms) {
        if (!existingIds.has(defaultTerm.id)) {
          dbConfig.terms.push(defaultTerm);
          console.log(`[Migration] Added missing term: ${defaultTerm.id}`);
        }
      }

      // 3. Ensure channels is a valid array
      if (!Array.isArray(dbConfig.channels) || dbConfig.channels.length === 0) {
        dbConfig.channels = ["dollarr_ly", "musheermarket", "lydollar", "djheih2026", "suqalmushir"];
        console.warn("[Migration] Channels list was empty or invalid, restored defaults.");
      }

      // 4. Ensure enableHttpScraper is explicitly set (defaults to true for existing users)
      if (dbConfig.enableHttpScraper === undefined) {
        dbConfig.enableHttpScraper = true;
        console.log("[Migration] Initialized enableHttpScraper to true");
      }

      appConfig = dbConfig;
      console.log(`[Startup] Initializing TelegramManager. TG_SESSION_V2 length: ${process.env.TG_SESSION_V2?.length || 0}`);
      telegramManager = getTelegramManager(
        Number(process.env.TELEGRAM_API_ID || appConfig.telegramApiId),
        process.env.TELEGRAM_API_HASH || appConfig.telegramApiHash || "",
        process.env.TG_SESSION_V2 || appConfig.telegramSessionString || ""
      );
      console.log("Loaded, merged and repaired config from Supabase successfully");
    }
  } catch (err) {
    console.error("Failed to load/repair config from Supabase", err);
  }
}

async function saveConfigToSupabase(newConfig: AppConfig) {
  if (!supabase || !supabaseAnonKey || supabaseAnonKey.includes('dummy')) return false;
  try {
    const { error } = await supabase
      .from('app_config')
      .upsert({ id: 1, config: newConfig });
      
    if (error) {
      console.error("Error saving config to Supabase:", error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("Failed to save config to Supabase", err);
    return false;
  }
}

// Telegram channels for parallel market rates

let isScraping = false;
let lastSuccessfulScrape = new Date();
let lastAttemptTime = 0;

interface LiveFeedMessage {
  channel: string;
  text: string;
  time: number;
}
let liveFeed: LiveFeedMessage[] = [];

async function fetchParallelRatesFromTelegram(): Promise<boolean | null> {
  console.log(`\n[Scraper] Starting parallel rates fetch at ${new Date().toISOString()}`);
  
  if (isScraping) {
    console.log("[Scraper] Scrape already in progress, skipping...");
    return null;
  }
  
  const now = Date.now();
  // Prevent retrying more than once every 2 minutes if it failed
  if (now - lastAttemptTime < 2 * 60 * 1000) {
    const remaining = Math.ceil((2 * 60 * 1000 - (now - lastAttemptTime)) / 1000);
    console.log(`[Scraper] Too soon since last attempt, skipping... (${remaining}s remaining)`);
    return null;
  }
  
  lastAttemptTime = now;
  isScraping = true;
  console.log("[Scraper] Lock acquired, starting extraction...");
  
  const scraperPromise = (async () => {
    try {
      const priceHistory: Record<string, { value: number, time: number, channel: string }[]> = {};
    for (const term of appConfig.terms) {
      priceHistory[term.id] = [];
    }

    let successfulChannels = 0;
    let totalMessagesProcessed = 0;

    // Pre-compile regexes for performance
    const compiledTerms = appConfig.terms
      .map(t => ({
        ...t,
        compiledRegex: new RegExp(t.regex, 'i')
      }));

    const extractRateFromText = (cleanText: string, time: number, channel: string) => {
      console.log(`[Scraper] Extracting from: ${cleanText.substring(0, 100)}...`);
      const extractRate = (compiledRegex: RegExp, key: string, min: number, max: number, isInverse = false) => {
        const match = cleanText.match(compiledRegex);
        if (!match) return;
        console.log(`[Scraper] Match found for ${key}: ${match[0]}`);

        let valStr = null;
        
        const firstCapturedNum = match[1] || match[3];
        const secondCapturedNum = match[2] || match[4];
        
        if (firstCapturedNum) {
          if (secondCapturedNum) {
            const secondIndex = match.index! + match[0].indexOf(secondCapturedNum);
            if (isProbablyDateOrTime(cleanText, secondIndex, secondCapturedNum)) {
              valStr = firstCapturedNum;
            } else {
              valStr = secondCapturedNum;
            }
          } else {
             valStr = firstCapturedNum;
          }
        }
        
        if (valStr) {
          // Clean the string: remove thousands separators like ',' or '.' if they are used as such,
          // but keep the decimal point. This is tricky.
          // Assuming format like 1160.000 or 1.160,000
          let cleanValStr = valStr.replace(/,/g, ''); 
          let val = parseFloat(cleanValStr);
          
          // Special handling for Lira Gold to avoid confusion with Turkish Lira
          if (key === 'GOLD_LIRA' && val < 500) {
             return;
          }

          if (key === 'TND' && val < 1.0 && val > 0) val = 1 / val;
          if (key === 'EGP' && val > 20.0) val = 1 / val;
          if (key === 'TRY' && val > 20.0) val = 1 / val;
          
          if (isInverse && val > 0) val = 1 / val;
          if (!isNaN(val) && val >= min && val <= max) {
            priceHistory[key].push({ value: val, time, channel });
          }
        }
      };

      for (const term of compiledTerms) {
        extractRate(term.compiledRegex, term.id, term.min, term.max, term.isInverse);
      }
    };

    console.log(`[Scraper] Starting fetch from ${appConfig.channels?.length || 0} channels.`);
    
    // Validate and clean channels
    const channels = (appConfig.channels || [])
      .filter(c => c && typeof c === 'string' && c.trim() !== '')
      .map(c => c.replace('@', '').trim());

    if (channels.length === 0) {
      console.warn("[Scraper] No channels configured.");
      await logErrorArabic("لا توجد قنوات تيليجرام مهيأة في الإعدادات", "الكاشط");
      return false;
    }

    console.log(`[Scraper] Validated channels: ${channels.join(', ')}`);
    
    // Calculate start of today in Libya (UTC+2)
    const nowTime = new Date();
    const libyaTime = new Date(nowTime.getTime() + (2 * 60 * 60 * 1000));
    const startOfTodayLibya = new Date(Date.UTC(
      libyaTime.getUTCFullYear(),
      libyaTime.getUTCMonth(),
      libyaTime.getUTCDate(),
      0, 0, 0, 0
    )).getTime() - (2 * 60 * 60 * 1000);
    
    console.log(`[Scraper] Filtering messages sent after: ${new Date(startOfTodayLibya).toISOString()} (Start of today in Libya)`);

    // Try GramJS first if configured
    let usedGramJs = false;
    let forceHttpScraper = false;

    // 1. Try environment variables first (Render priority)
    console.log("[Scraper] Attempting to initialize Telegram via environment variables...");
    let client = null;
    try {
      client = await initializeTelegram();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error("[Scraper] GramJS initialization via environment variables failed:", errorMsg);
      await logErrorArabic(`فشل تهيئة تيليجرام عبر متغيرات البيئة: ${errorMsg}`, "الكاشط");
    }

    // 2. Fallback to appConfig if environment variables are missing or failed
    if (!client && appConfig.telegramApiId && appConfig.telegramApiHash && appConfig.telegramSessionString) {
      console.log("[Scraper] Environment variables missing or failed. Attempting via appConfig...");
      try {
        client = await getTelegramClient(Number(appConfig.telegramApiId), appConfig.telegramApiHash, appConfig.telegramSessionString);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        console.error("[Scraper] GramJS client failed via appConfig:", errorMsg);
        await logErrorArabic(`فشل الاتصال بحساب تيليجرام (appConfig): ${errorMsg}`, "الكاشط");
      }
    }

    // 3. TelegramManager handled by singleton
    if (telegramManager) {
      usedGramJs = true;
      console.log("[Scraper] TelegramManager ready. Fetching channels in parallel...");
      
      const gramJsResults = await Promise.allSettled(channels.map(async (channel) => {
        try {
          const messages = await telegramManager.fetchMessages(channel, 5);
          return { channel, messages };
        } catch (err) {
          throw { channel, error: err };
        }
      }));

      for (const result of gramJsResults) {
        if (result.status === 'fulfilled') {
          const { channel, messages } = result.value;
          if (messages.length > 0) {
            console.log(`[Scraper-GramJS] Fetched ${messages.length} messages from ${channel}`);
            successfulChannels++;
            totalMessagesProcessed += messages.length;
            for (const msg of messages) {
              // Only process messages from today
              if (msg.date < startOfTodayLibya) {
                console.log(`[Scraper-GramJS] Skipping old message from ${channel} (Date: ${new Date(msg.date).toISOString()})`);
                continue;
              }

              liveFeed.unshift({ channel, text: msg.text, time: msg.date });
              if (liveFeed.length > 5) liveFeed = liveFeed.slice(0, 5);

              const cleanText = msg.text.replace(/\n/g, ' ');
              extractRateFromText(cleanText, msg.date, channel);
            }
          } else {
            console.warn(`[Scraper-GramJS] No messages returned for ${channel}`);
          }
        } else {
          const { channel, error } = result.reason;
          const errorMsg = error instanceof Error ? error.message : String(error);
          console.error(`[Scraper-GramJS] Error fetching ${channel}:`, errorMsg);
          await logErrorArabic(`خطأ في جلب رسائل القناة ${channel} عبر TelegramManager`, "الكاشط", errorMsg);
        }
      }
    } else {
      console.warn("[Scraper] TelegramManager failed. Forcing HTTP Scraper fallback.");
      await logErrorArabic("فشل الاتصال بـ GramJS. جاري استخدام الكاشط التقليدي كبديل إجباري.", "الكاشط");
      forceHttpScraper = true;
    }

    if (!usedGramJs || successfulChannels === 0 || forceHttpScraper) {
      if (usedGramJs && successfulChannels === 0 && !forceHttpScraper) {
        console.warn("[Scraper] GramJS returned 0 messages for all channels.");
      }
      
      const canUseHttpScraper = appConfig.enableHttpScraper === true;
      if (canUseHttpScraper) {
        console.log("[Scraper] Using HTTP Scraper fallback...");
        const USER_AGENTS = [
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
          'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1',
          'Mozilla/5.0 (iPad; CPU OS 17_2_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1',
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:122.0) Gecko/20100101 Firefox/122.0'
        ];

        // Fallback to HTTP Scraper
        const scrapeResults = await Promise.allSettled(channels.map(async (channel, index) => {
          // Staggered delay to avoid hitting rate limits simultaneously
          await new Promise(resolve => setTimeout(resolve, index * 800 + Math.random() * 500));
          
          const startTime = Date.now();
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000); // Reduced timeout per channel
            
            const randomUA = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
            
            // Try different access patterns if blocked
            const response = await fetch(`https://t.me/s/${channel}`, { 
              signal: controller.signal,
              headers: {
                'User-Agent': randomUA,
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9,ar;q=0.8',
                'Cache-Control': 'max-age=0',
                'Sec-Ch-Ua': '"Not A(Brand";v="99", "Google Chrome";v="121", "Chromium";v="121"',
                'Sec-Ch-Ua-Mobile': '?0',
                'Sec-Ch-Ua-Platform': '"Windows"',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'none',
                'Sec-Fetch-User': '?1',
                'Upgrade-Insecure-Requests': '1'
              }
            });
            clearTimeout(timeoutId);
            const duration = Date.now() - startTime;

          if (!response.ok) {
            const errorText = await response.text().catch(() => "No error body");
            console.warn(`[Scraper] Channel ${channel} returned status ${response.status} after ${duration}ms: ${errorText.substring(0, 50)}`);
            await logErrorArabic(`قناة ${channel} أرجعت حالة ${response.status}`, "الكاشط", errorText.substring(0, 100));
            return null;
          }
          const html = await response.text();
          console.log(`[Scraper] Successfully fetched ${channel} in ${duration}ms. HTML size: ${Math.round(html.length / 1024)}KB`);
          
          // Check for Telegram anti-bot protection
          if (html.includes("verify you are a human") || html.includes("robot") || html.includes("captcha")) {
            console.warn(`[Scraper] Channel ${channel} is blocked by Telegram anti-bot protection.`);
            await logErrorArabic(`قناة ${channel} محجوبة حالياً بواسطة حماية تيليجرام (Anti-bot)`, "الكاشط");
            return null;
          }

          // More robust message block detection
          const messageBlocks = html.split('tgme_widget_message_wrap');
          if (messageBlocks.length <= 1) {
            // Try another common class if the wrap is missing
            const altBlocks = html.split('tgme_widget_message ');
            if (altBlocks.length <= 1) {
              console.warn(`[Scraper] No message blocks found for channel ${channel}. HTML length: ${html.length}`);
              await logErrorArabic(`لم يتم العثور على رسائل في قناة ${channel}`, "الكاشط", `طول HTML: ${html.length}`);
              return null;
            }
            return { channel, html, blocks: altBlocks };
          }

          return { channel, html, blocks: messageBlocks };
        } catch (e) {
          const duration = Date.now() - startTime;
          const errorMsg = e instanceof Error ? e.message : String(e);
          console.error(`[Scraper] Failed to fetch ${channel} after ${duration}ms:`, errorMsg);
          await logErrorArabic(`فشل الاتصال بقناة تيليجرام: ${channel}`, "الكاشط", errorMsg);
          return null;
        }
      }));

      for (const result of scrapeResults) {
        if (result.status === 'fulfilled' && result.value) {
          const { channel, blocks } = result.value;
          
          successfulChannels++;
          
          // Only take the last 5 messages from the blocks
          const recentBlocks = blocks.slice(-6); 
          totalMessagesProcessed += (recentBlocks.length - 1);

          for (const block of recentBlocks) {
            const textMatch = block.match(/<div class="tgme_widget_message_text[^>]*>(.*?)<\/div>/);
            const timeMatch = block.match(/<time datetime="([^"]+)"/);
            
            if (textMatch && timeMatch) {
              const cleanText = textMatch[1].replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ');
              const time = new Date(timeMatch[1]).getTime();
              
              // Use the Libya-aware today filter
              if (time < startOfTodayLibya) {
                continue; 
              }

              liveFeed.unshift({ channel, text: cleanText, time });
              if (liveFeed.length > 5) liveFeed = liveFeed.slice(0, 5);

              extractRateFromText(cleanText, time, channel);
            }
          }
        }
      }
    } else {
      console.log("[Scraper] HTTP Scraper is disabled, skipping fallback.");
    }
  }

  if (successfulChannels > 0) {
    lastSuccessfulScrape = new Date();
    console.log(`[Scraper] Successfully processed ${totalMessagesProcessed} messages from ${successfulChannels} channels.`);
  } else {
    console.warn("[Scraper] Failed to fetch any messages from any channels.");
    await logErrorArabic("فشل الكاشط في جلب أي بيانات من جميع القنوات", "الكاشط", `القنوات: ${channels.join(', ')}`);
  }

    // Memory monitoring
    const mem = process.memoryUsage();
    console.log(`[Scraper] Starting processing. Memory: RSS=${Math.round(mem.rss/1024/1024)}MB, Heap=${Math.round(mem.heapUsed/1024/1024)}MB`);

    const latestRates: Record<string, number> = {};
    const latestSources: Record<string, string> = {};
    const previousRates: Record<string, number> = {};
    let newestMessageTime = 0;

    for (const key in priceHistory) {
      if (priceHistory[key].length === 0) continue;

      // New Logic: 1. Sort by time (Newest First)
      // This ensures that the most recent message always wins for this specific currency
      const historyArr = priceHistory[key].sort((a, b) => {
        if (b.time !== a.time) return b.time - a.time;
        // If times are exactly equal (rare), prefer our owner channel
        if (b.channel === "djheih2026") return 1;
        if (a.channel === "djheih2026") return -1;
        return 0;
      });
      
      // The newest price is now at index 0
      const newestEntry = historyArr[0];
      latestRates[key] = newestEntry.value; 
      latestSources[key] = newestEntry.channel;
      
      if (newestEntry.time > newestMessageTime) {
        newestMessageTime = newestEntry.time;
      }
      
      // Find a TRUE previous price for trend detection (find the first price that differs from the newest)
      for (let i = 1; i < historyArr.length; i++) {
        if (isSignificantChange(historyArr[i].value, newestEntry.value)) {
          previousRates[key] = historyArr[i].value;
          break;
        }
      }
    }

    const foundKeys = Object.keys(latestRates);
    if (foundKeys.length > 0) {
      console.log(`[Scraper] Scrape check completed. Found rates for: ${foundKeys.join(', ')}`);
      
      let anyChanged = false;

      // Dynamically assign all extracted rates
      for (const term of appConfig.terms) {
        // Skip gold and silver as requested
        if (term.id.startsWith('GOLD') || term.id.startsWith('SILVER')) continue;

        const currentVal = rates.parallel[term.id];
        const newValFromTelegram = latestRates[term.id];

        if (newValFromTelegram !== undefined) {
          // Strict validation: new price should not deviate by more than 25% from the current price
          if (currentVal !== undefined && currentVal > 0) {
            const deviation = Math.abs(newValFromTelegram - currentVal) / currentVal;
            if (deviation > 0.25) {
              const sourceName = latestSources[term.id] || 'غير معروف';
              const msg = `تم رفض تحديث سعر ${term.name} (${term.id}) من المصدر (${sourceName}) بسبب قفزة غير منطقية من ${currentVal} إلى ${newValFromTelegram} (تغيير بنسبة ${(deviation*100).toFixed(1)}%)`;
              console.warn(`[Scraper] ${msg}`);
              await logErrorArabic(msg, "حماية البيانات");
              continue; // Skip this update
            }
          }

          // If we found a price in Telegram, and it's DIFFERENT from what we have in Memory
          if (isSignificantChange(currentVal, newValFromTelegram)) {
            console.log(`[Scraper] Price update: ${term.id} (${currentVal} -> ${newValFromTelegram}) Source: ${latestSources[term.id]}`);
            
            rates.previousParallel[term.id] = currentVal || newValFromTelegram;
            rates.parallel[term.id] = newValFromTelegram;
            rates.lastChanged.parallel[term.id] = new Date().toISOString();
            anyChanged = true;
            
            const changeLog = {
              id: Math.random().toString(36).substring(2, 9),
              currencyCode: term.id,
              currencyName: term.name,
              oldPrice: currentVal || 0,
              newPrice: newValFromTelegram,
              source: latestSources[term.id] || "Telegram",
              timestamp: new Date().toISOString()
            };
            await logPriceChange(changeLog);
          } else {
            // Price is effectively the same, just sync memory but keep original lastChanged date
            rates.parallel[term.id] = newValFromTelegram;
          }
        }
        // If this term (e.g. EURO) was NOT in today's newest messages, we leave it AS IS.
        // It will keep its old price and its old lastChanged date until it appears again.
      }

      // Refine previous rates with actual Telegram history if available and realistic
      for (const term of appConfig.terms) {
        const key = term.id;
        if (previousRates[key] && latestRates[key] && Math.abs(previousRates[key] - latestRates[key]) < (latestRates[key] * 0.2)) {
          // If we found a different previous rate in the telegram history, we could use it
          // But our goal is "accurate date of LAST CHANGE", so we keep the memory one unless it's null
          if (!rates.previousParallel[key]) rates.previousParallel[key] = previousRates[key];
        }
      }

      // Sync check rates after processing all terms
      const synced = await syncCheckRates("كاشط تيليجرام");
      if (synced) anyChanged = true;

      if (anyChanged) {
        if (newestMessageTime > 0) {
          rates.lastUpdated = new Date(newestMessageTime).toISOString();
        } else {
          rates.lastUpdated = new Date().toISOString();
        }
        
        console.log(`[Scraper] Applied changes. New USD: ${rates.parallel.USD}`);
        
        // Also update local history fallback for chart
        history.push({
          time: new Date().toISOString(),
          usdParallel: rates.parallel.USD,
          usdOfficial: rates.official.USD,
          ratesParallel: { ...rates.parallel },
          ratesOfficial: { ...rates.official }
        });
        if (history.length > 5000) history.shift();
      }

      return anyChanged;
    }
    return false;
  } catch (error) {
    console.error("Error fetching from Telegram:", error);
    return false;
  } finally {
    isScraping = false;
  }
})();

const timeoutPromise = new Promise<null>((_, reject) => {
  setTimeout(() => reject(new Error("Global Scraper Timeout")), 22000);
});

try {
  return await Promise.race([scraperPromise, timeoutPromise]);
} catch (err) {
  console.error(`[Scraper] ${err instanceof Error ? err.message : String(err)}`);
  isScraping = false;
  return null;
}
}

// Initial fetch and setup
initializeRatesFromDB().then(() => {
  loadConfigFromSupabase().then(() => {
    console.log("Server initialized. Waiting for cron job to trigger /api/refresh.");
  });
});

// Auto-cleanup old data to keep the database clean
const cleanupOldData = async () => {
  if (!supabase || !supabaseAnonKey || supabaseAnonKey.includes('dummy')) return;
  
  try {
    console.log("Running scheduled database cleanup...");
    
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const cutoff = sevenDaysAgo.toISOString();

    // Perform all deletions in parallel for better performance
    const [legacyRes, parallelRes, officialRes, logsRes, changesRes] = await Promise.all([
      supabase.from('exchange_rates').delete({ count: 'exact' }).lt('recorded_at', cutoff),
      supabase.from('parallel_rates').delete({ count: 'exact' }).lt('recorded_at', cutoff),
      supabase.from('official_rates').delete({ count: 'exact' }).lt('recorded_at', cutoff),
      supabase.from('error_logs').delete({ count: 'exact' }).lt('created_at', cutoff),
      supabase.from('price_changes_log').delete({ count: 'exact' }).lt('created_at', cutoff)
    ]);

    const removedRates = (legacyRes.count || 0) + (parallelRes.count || 0) + (officialRes.count || 0);
    const removedLogs = logsRes.count || 0;
    const removedChanges = changesRes.count || 0;

    // Log any errors that occurred during parallel deletion, ignoring missing tables
    const errors = [legacyRes.error, parallelRes.error, officialRes.error, logsRes.error, changesRes.error]
      .filter(err => err && err.code !== '42P01');

    if (errors.length > 0) {
      console.error("Cleanup partial error:", { 
        legacy: legacyRes.error?.message, 
        parallel: parallelRes.error?.message, 
        official: officialRes.error?.message, 
        logs: logsRes.error?.message,
        changes: changesRes.error?.message
      });
    }

    console.log(`Database cleanup completed. Removed ${removedRates} rates, ${removedLogs} logs, and ${removedChanges} price changes older than 7 days.`);
  } catch (error) {
    console.error("Failed to run database cleanup:", error);
  }
};

// --- Memory Watchdog & Self-Healing ---
const monitorMemory = () => {
  const mem = process.memoryUsage();
  const heapUsedMB = Math.round(mem.heapUsed / 1024 / 1024);
  const rssMB = Math.round(mem.rss / 1024 / 1024);

  console.log(`[Watchdog] Memory Check: Heap=${heapUsedMB}MB, RSS=${rssMB}MB`);

  // If memory is getting high (Render free tier is 512MB), clear internal caches
  if (heapUsedMB > 400 || rssMB > 450) {
    console.warn(`[Watchdog] HIGH MEMORY DETECTED (${heapUsedMB}MB). Triggering emergency cache cleanup...`);
    cachedHistory = null;
    lastHistoryFetchTime = 0;
    lastRatesFetchTime = 0;
    
    // Suggest GC to V8 if exposed
    if (global && typeof (global as any).gc === 'function') {
      try { (global as any).gc(); } catch (e) {}
    }
  }
};

// Run memory watchdog every 30 minutes
setInterval(monitorMemory, 30 * 60 * 1000);

// Run cleanup once on startup, then every 24 hours
cleanupOldData();
setInterval(cleanupOldData, 24 * 60 * 60 * 1000);

// Graceful shutdown
const gracefulShutdown = async () => {
  console.log("[Server] Shutting down gracefully...");
  if (activeClient && activeClient.connected) {
    try {
      console.log("[GramJS] Disconnecting Telegram client...");
      await activeClient.disconnect();
    } catch (e) {
      console.error("[GramJS] Error during disconnect:", e);
    }
  }
  process.exit(0);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

async function startServer() {
  const app = express();
  const server = createServer(app);
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  // Online Users Tracking
  const wss = new WebSocketServer({ server });
  let onlineUsers = 0;

  wss.on('connection', (ws: any) => {
    onlineUsers++;
    broadcastOnlineCount();

    ws.on('close', () => {
      onlineUsers = Math.max(0, onlineUsers - 1);
      broadcastOnlineCount();
    });
  });

  function broadcastOnlineCount() {
    const data = JSON.stringify({ type: 'online_count', count: onlineUsers });
    wss.clients.forEach((client: any) => {
      if (client.readyState === 1) {
        client.send(data);
      }
    });
  }

  function broadcastRatesUpdate(updatedRates: Rates) {
    const data = JSON.stringify({ type: 'rates_update', rates: updatedRates });
    wss.clients.forEach((client: any) => {
      if (client.readyState === 1) {
        client.send(data);
      }
    });
  }

  // Global Error Handlers
  process.on('unhandledRejection', async (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    await logErrorArabic(`خطأ غير معالج في السيرفر: ${reason}`, "النظام", String(reason));
  });

  process.on('uncaughtException', async (error) => {
    console.error('Uncaught Exception:', error);
    await logErrorArabic(`خطأ فادح في السيرفر: ${error.message}`, "النظام", error.stack || "");
    // Give some time for logging before exiting
    setTimeout(() => process.exit(1), 1000);
  });

  app.use(express.json());
  app.set('trust proxy', 1);

  // Security Middlewares
  const bannedIPs = new Map<string, number>();

  const ipBanMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress) as string;
    if (ip && bannedIPs.has(ip)) {
      const banExpiry = bannedIPs.get(ip)!;
      if (Date.now() < banExpiry) {
        res.status(403).json({ success: false, error: "Your IP is temporarily banned due to excessive requests or suspicious activity." });
        return;
      } else {
        bannedIPs.delete(ip);
      }
    }
    next();
  };

  const suspiciousRoutes = ['/.env', '/wp-admin', '/wp-login.php', '/config.php', '/phpmyadmin'];
  const suspiciousActivityMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (suspiciousRoutes.some(route => req.path.toLowerCase().includes(route))) {
      const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress) as string;
      if (ip) {
        // Ban permanently (or for a very long time, e.g., 30 days)
        bannedIPs.set(ip, Date.now() + 30 * 24 * 60 * 60 * 1000);
        console.warn(`[Security] Banned IP ${ip} for accessing suspicious route: ${req.path}`);
      }
      res.status(403).json({ success: false, error: "Suspicious activity detected. IP banned." });
      return;
    }
    next();
  };

  const userAgentMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    // Only apply to API routes
    if (req.path.startsWith('/api/')) {
      const ua = req.headers['user-agent'];
      if (!ua || ua.trim() === '' || ua.length < 5) {
        res.status(403).json({ success: false, error: "Valid User-Agent header is required." });
        return;
      }
    }
    next();
  };

  const timeoutMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    // Set timeout to 5 seconds for API routes
    if (req.path.startsWith('/api/')) {
      res.setTimeout(5000, () => {
        if (!res.headersSent) {
          res.status(408).json({ success: false, error: "Request Timeout (5s limit exceeded)" });
        }
      });
    }
    next();
  };

  app.use(ipBanMiddleware);
  app.use(suspiciousActivityMiddleware);
  app.use(userAgentMiddleware);
  app.use(timeoutMiddleware);

  // Security Headers
  app.use(helmet({
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: false,
    // frameguard is enabled by default (SAMEORIGIN), which prevents other sites from embedding this site in an iframe
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        "img-src": ["'self'", "data:", "https://flagcdn.com", "https://hatscripts.github.io", "https://picsum.photos", "https://*.supabase.co", "https://*.google.com", "https://*.gstatic.com"],
        "connect-src": ["'self'", "https://open.er-api.com", "https://t.me", "https://*.supabase.co", "wss:", "ws:", "https://*.google.com", "https://*.gstatic.com", "https://*.googleapis.com"],
        "script-src": ["'self'", "'unsafe-inline'", "'unsafe-eval'", "blob:", "https://*.google.com", "https://*.gstatic.com"],
        "font-src": ["'self'", "https://fonts.gstatic.com", "data:", "https://*.googleapis.com"],
        "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://*.gstatic.com"],
        "frame-ancestors": ["'self'", "https://*.google.com", "https://*.corp.google.com"],
        "worker-src": ["'self'", "blob:"],
        "upgrade-insecure-requests": null,
      },
    },
  }));

  // Rate Limiting
  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { success: false, message: "محاولات كثيرة جداً، يرجى المحاولة لاحقاً" },
    standardHeaders: true,
    legacyHeaders: false,
  });

  const apiLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.use("/api/", apiLimiter);

  // --- Admin API ---
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
  
  const effectiveAdminPassword = ADMIN_PASSWORD;
  
  if (!effectiveAdminPassword) {
    console.error("CRITICAL: ADMIN_PASSWORD not set. Admin features will be disabled for security.");
  }

  let adminToken = Math.random().toString(36).substring(2) + Date.now().toString(36);

  app.post("/api/admin/login", (req: express.Request, res: express.Response) => {
    const { password } = req.body;
    if (password === effectiveAdminPassword) {
      res.json({ success: true, token: adminToken });
    } else {
      res.status(401).json({ success: false, message: "كلمة المرور غير صحيحة" });
    }
  });

  const requireAdmin = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const authHeader = req.headers.authorization;
    if (authHeader === `Bearer ${adminToken}`) {
      next();
    } else {
      res.status(401).json({ success: false, message: "غير مصرح" });
    }
  };


  app.get("/api/ping", (req, res) => {
    const minutesSinceLastScrape = Math.floor((Date.now() - lastSuccessfulScrape.getTime()) / 60000);
    
    // Fallback: if pinged and last scrape was more than 10 mins ago, trigger it
    if (minutesSinceLastScrape >= 10) {
      console.log(`[Ping-Trigger] Last scrape was ${minutesSinceLastScrape} mins ago. Triggering update...`);
      (async () => {
        try {
          await fetchOfficialRates();
          await fetchParallelRatesFromTelegram();
        } catch (err) {
          console.error("[Ping-Trigger] Error during update:", err);
        }
      })();
    }

    res.json({ 
      status: "pong", 
      lastScrape: lastSuccessfulScrape.toISOString(),
      minutesSinceLastScrape
    });
  });

  app.get("/api/admin/api-stats", requireAdmin, (req: express.Request, res: express.Response) => {
    res.json(apiStats);
  });

  app.post("/api/admin/api-config", requireAdmin, async (req: express.Request, res: express.Response) => {
    try {
      const newConfig = req.body;
      appConfig.apiConfig = {
        ...appConfig.apiConfig,
        ...newConfig,
      };
      
      // Update the rate limiter dynamically
      publicApiLimiter.windowMs = appConfig.apiConfig?.rateLimitWindowMs || 60000;
      publicApiLimiter.max = appConfig.apiConfig?.rateLimitMaxRequests || 20;

      await saveConfigToSupabase(appConfig);
      res.json({ success: true, config: appConfig.apiConfig });
    } catch (err) {
      console.error("Error updating API config:", err);
      res.status(500).json({ success: false, error: "Failed to update API config" });
    }
  });

  app.get("/api/admin/diagnostics", requireAdmin, async (req: express.Request, res: express.Response) => {
    try {
      const dbStatus = await supabase?.from('logs').select('id').limit(1).then(() => true).catch(() => false) || false;
      const telegramStatus = telegramManager ? true : false;
      
      let regexStatus = true;
      try {
        appConfig.terms.forEach(t => new RegExp(t.regex, 'i'));
      } catch (e) {
        regexStatus = false;
      }

      const allGood = dbStatus && telegramStatus && regexStatus;
      
      res.json({
        success: true,
        status: allGood ? 'ok' : 'error',
        db: dbStatus ? 'ok' : 'error',
        telegram: telegramStatus ? 'ok' : 'error',
        regex: regexStatus ? 'ok' : 'error'
      });
    } catch (e) {
      res.status(500).json({ success: false, error: String(e) });
    }
  });

  app.post("/api/admin/clear-queue", requireAdmin, (req: express.Request, res: express.Response) => {
    liveFeed = [];
    res.json({ success: true, message: "تم تفريغ الطابور والرسائل المعلقة بنجاح ✅" });
  });

  app.post("/api/admin/clear-ram", requireAdmin, (req: express.Request, res: express.Response) => {
    try {
      if (global.gc) {
        global.gc();
        res.json({ success: true, message: "تم تنظيف الذاكرة العشوائية (RAM) بنجاح ✅" });
      } else {
        res.json({ success: true, message: "تم تنظيف الكاش الداخلي بنجاح ✅ (GC غير مفعل)" });
      }
    } catch (e) {
      res.json({ success: true, message: "تم تنظيف الكاش الداخلي بنجاح ✅" });
    }
  });

  app.get("/api/admin/live-feed", requireAdmin, (req: express.Request, res: express.Response) => {
    res.json({ success: true, feed: liveFeed });
  });

  app.get("/api/admin/config", requireAdmin, (req: express.Request, res: express.Response) => {
    res.json({ ...appConfig, serverStartTime: serverStartTime.toISOString() });
  });

  app.post("/api/admin/config", requireAdmin, async (req: express.Request, res: express.Response) => {
    try {
      const newConfig = req.body as AppConfig;
      if (!newConfig.channels || !newConfig.terms) {
        return res.status(400).json({ success: false, message: "بيانات غير صالحة" });
      }
      appConfig = newConfig;
      const saved = await saveConfigToSupabase(appConfig);
      if (!saved) {
        return res.status(500).json({ success: false, message: "تم تحديث السيرفر، لكن فشل الحفظ في قاعدة البيانات" });
      }
      
      const parallelTally = await fetchParallelRatesFromTelegram();
      if (parallelTally) {
        await saveToSupabase('parallel');
        broadcastRatesUpdate(rates);
      }
      
      res.json({ success: true, message: "تم حفظ الإعدادات بنجاح" });
    } catch (err) {
      console.error("Error saving config:", err);
      res.status(500).json({ success: false, message: "حدث خطأ أثناء الحفظ" });
    }
  });

  // --- Telegram MTProto Auth Endpoints ---
  
  // Store temporary clients during auth flow
  const tempClients: Record<string, { client: TelegramClient, apiId: number, apiHash: string }> = {};

  app.post("/api/admin/telegram/send-code", requireAdmin, async (req: express.Request, res: express.Response) => {
    try {
      const { phoneNumber, apiId, apiHash } = req.body;
      if (!phoneNumber || !apiId || !apiHash) {
        return res.status(400).json({ success: false, message: "بيانات غير مكتملة" });
      }

      const stringSession = new StringSession("");
      const client = new TelegramClient(stringSession, Number(apiId), apiHash, {
        connectionRetries: 5,
        useWSS: false,
      });

      await client.connect();
      
      const sendCodeResult = await client.sendCode(
        {
          apiId: Number(apiId),
          apiHash: apiHash,
        },
        phoneNumber
      );

      // Store client temporarily to complete auth later
      const authId = Math.random().toString(36).substring(7);
      tempClients[authId] = { client, apiId: Number(apiId), apiHash };

      res.json({ 
        success: true, 
        phoneCodeHash: sendCodeResult.phoneCodeHash,
        authId: authId
      });
    } catch (err: any) {
      console.error("Telegram send code error:", err);
      res.status(500).json({ success: false, message: err.message || "فشل إرسال الكود" });
    }
  });

  app.post("/api/admin/telegram/verify-code", requireAdmin, async (req: express.Request, res: express.Response) => {
    try {
      const { phoneNumber, phoneCodeHash, code, password, authId } = req.body;
      
      const sessionData = tempClients[authId];
      if (!sessionData) {
        return res.status(400).json({ success: false, message: "جلسة التحقق غير صالحة أو منتهية" });
      }

      const { client, apiId, apiHash } = sessionData;

      await client.invoke(new Api.auth.SignIn({
        phoneNumber,
        phoneCodeHash,
        phoneCode: code
      })).catch(async (err: any) => {
        if (err.message.includes('SESSION_PASSWORD_NEEDED')) {
          if (!password) {
             throw new Error("كلمة مرور التحقق بخطوتين (2FA) مطلوبة");
          }
          // Use password as a function to avoid "password is not a function" error
          await client.signInWithPassword(
            { apiId, apiHash }, 
            { 
              password: async () => password, 
              onError: (e) => { throw e; } 
            }
          );
        } else {
          throw err;
        }
      });

      const sessionString = (client.session as StringSession).save();
      
      // Disconnect the temp client to prevent AUTH_KEY_DUPLICATED when the scraper uses the session
      try {
        await client.disconnect();
      } catch (e) {
        console.error("Error disconnecting temp client:", e);
      }
      
      // Clean up temp client
      delete tempClients[authId];

      res.json({ 
        success: true, 
        sessionString: sessionString 
      });
    } catch (err: any) {
      console.error("Telegram verify code error:", err);
      res.status(500).json({ success: false, message: err.message || "فشل التحقق من الكود" });
    }
  });

  app.post("/api/admin/refresh", requireAdmin, async (req: express.Request, res: express.Response) => {
    try {
      console.log(`[Admin] Manual refresh triggered`);
      const officialUpdate = await fetchOfficialRates();
      const parallelTally = await fetchParallelRatesFromTelegram();
      
      if (officialUpdate || parallelTally) {
        console.log("[Admin] Changes detected! Saving to database...");
        const saveType = (officialUpdate && parallelTally) ? 'both' : (officialUpdate ? 'official' : 'parallel');
        await saveToSupabase(saveType);
        broadcastRatesUpdate(rates);
      }
      
      res.json({ 
        success: true, 
        message: "تم تشغيل عملية التحديث بنجاح",
        details: {
          official: officialUpdate ? "تم التحديث" : "لا يوجد تغيير",
          parallel: parallelTally ? "تم التحديث" : "لا يوجد تغيير"
        }
      });
    } catch (err) {
      console.error("Manual refresh failed:", err);
      res.status(500).json({ success: false, message: "فشل التحديث اليدوي" });
    }
  });

  app.post("/api/admin/cleanup", requireAdmin, async (req: express.Request, res: express.Response) => {
    try {
      console.log(`[Admin] Manual cleanup triggered by admin session`);
      await cleanupOldData();
      res.json({ success: true, message: "تم تنظيف البيانات القديمة بنجاح" });
    } catch (err) {
      console.error("Manual cleanup failed:", err);
      res.status(500).json({ success: false, message: "فشل تنظيف البيانات" });
    }
  });

  app.get("/api/admin/stats", requireAdmin, async (req: express.Request, res: express.Response) => {
    try {
      const minutesSinceLastScrape = Math.floor((Date.now() - lastSuccessfulScrape.getTime()) / 60000);
      
      let dbStats = {
        parallelRatesCount: 0,
        officialRatesCount: 0,
        errorLogsCount: 0,
        priceChangesCount: 0
      };

      if (supabase && supabaseAnonKey && !supabaseAnonKey.includes('dummy')) {
        try {
          const [parallel, official, logs, changes] = await Promise.all([
            supabase.from('parallel_rates').select('*', { count: 'exact', head: true }),
            supabase.from('official_rates').select('*', { count: 'exact', head: true }),
            supabase.from('error_logs').select('*', { count: 'exact', head: true }),
            supabase.from('price_changes_log').select('*', { count: 'exact', head: true })
          ]);

          dbStats = {
            parallelRatesCount: parallel.count || 0,
            officialRatesCount: official.count || 0,
            errorLogsCount: logs.count || 0,
            priceChangesCount: changes.count || 0
          };
        } catch (e) {
          console.error("Failed to fetch DB stats:", e);
        }
      }

      res.json({
        onlineUsers,
        lastSuccessfulScrape: lastSuccessfulScrape.toISOString(),
        minutesSinceLastScrape,
        channelsCount: appConfig.channels.length,
        termsCount: appConfig.terms.length,
        serverUptime: process.uptime(),
        serverStartTime: serverStartTime.toISOString(),
        memoryUsage: process.memoryUsage(),
        dbStats
      });
    } catch (err) {
      console.error("Stats fetch failed:", err);
      res.status(500).json({ success: false, message: "فشل جلب الإحصائيات" });
    }
  });

  app.get("/api/admin/error-logs", requireAdmin, async (req: express.Request, res: express.Response) => {
    if (!supabase || !supabaseAnonKey || supabaseAnonKey.includes('dummy')) {
      return res.json({ success: false, message: "قاعدة البيانات غير متصلة" });
    }
    try {
      const { data, error } = await supabase
        .from('error_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      res.json(data);
    } catch (err) {
      console.error("Error fetching logs:", err);
      res.status(500).json({ success: false, message: "فشل جلب السجلات" });
    }
  });

  app.get("/api/temp-logs", async (req: express.Request, res: express.Response) => {
    if (!supabase || !supabaseAnonKey || supabaseAnonKey.includes('dummy')) {
      return res.json({ success: false, message: "قاعدة البيانات غير متصلة" });
    }
    try {
      const { data, error } = await supabase
        .from('error_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      res.json(data);
    } catch (err) {
      console.error("Error fetching logs:", err);
      res.status(500).json({ success: false, message: "فشل جلب السجلات" });
    }
  });

  app.get("/api/temp-config", async (req: express.Request, res: express.Response) => {
    res.json(appConfig);
  });

  app.post("/api/admin/extract", requireAdmin, async (req: express.Request, res: express.Response) => {
    try {
      const { text } = req.body;
      if (!text) {
        return res.status(400).json({ success: false, message: "No text provided" });
      }
      
      const extractedRates: Record<string, number> = {};
      const lines = text.split('\n');
      
      for (const line of lines) {
        const cleanText = line.trim().replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ');
        if (!cleanText) continue;

        for (const term of appConfig.terms) {
          const regex = new RegExp(term.regex, 'i');
          const match = cleanText.match(regex);
          if (!match) continue;

          let valStr = null;
          const firstCapturedNum = match[1] || match[3];
          const secondCapturedNum = match[2] || match[4];
          
          if (firstCapturedNum) {
            if (secondCapturedNum) {
              const secondIndex = match.index! + match[0].indexOf(secondCapturedNum);
              if (isProbablyDateOrTime(cleanText, secondIndex, secondCapturedNum)) {
                valStr = firstCapturedNum;
              } else {
                valStr = secondCapturedNum;
              }
            } else {
               valStr = firstCapturedNum;
            }
          }
          
          if (valStr) {
            let cleanValStr = valStr.replace(/,/g, ''); 
            let val = parseFloat(cleanValStr);
            
            // Special handling for Lira Gold to avoid confusion with Turkish Lira
            if (term.id === 'GOLD_LIRA' && val < 500) {
               continue;
            }

            if (term.id === 'TND' && val < 1.0 && val > 0) val = 1 / val;
            if (term.id === 'EGP' && val > 20.0) val = 1 / val;
            if (term.id === 'TRY' && val > 20.0) val = 1 / val;
            
            if (term.isInverse && val > 0) val = 1 / val;
            if (!isNaN(val) && val >= term.min && val <= term.max) {
              extractedRates[term.id] = val;
            }
          }
        }
      }

      if (Object.keys(extractedRates).length > 0) {
        res.json({ success: true, extractedRates });
      } else {
        res.json({ success: false, message: "لم يتمكن النظام من استخراج أي أسعار من النص المدخل" });
      }
    } catch (err: any) {
      console.error("Extraction failed:", err);
      res.status(500).json({ success: false, message: `خطأ في الاستخراج: ${err.message || 'فشل العملية'}` });
    }
  });

  app.post("/api/admin/rates", requireAdmin, async (req: express.Request, res: express.Response) => {
    try {
      const { updates } = req.body;
      if (!updates || typeof updates !== 'object') {
        return res.status(400).json({ success: false, message: "Invalid updates object" });
      }
      
      let changed = false;
      for (const [key, value] of Object.entries(updates)) {
        const numValue = Number(value);
        if (!isNaN(numValue) && numValue > 0) {
          if (rates.parallel[key] !== numValue) {
            const oldVal = rates.parallel[key] || numValue;
            rates.previousParallel[key] = oldVal;
            rates.parallel[key] = numValue;
            rates.lastChanged.parallel[key] = new Date().toISOString();
            changed = true;
            
            const term = appConfig.terms.find(t => t.id === key);
            const changeLog = {
              id: Math.random().toString(36).substring(2, 9),
              currencyCode: key,
              currencyName: term ? term.name : key,
              oldPrice: oldVal,
              newPrice: numValue,
              source: "تعديل يدوي (المدير)",
              timestamp: new Date().toISOString()
            };
            await logPriceChange(changeLog);
          }
        }
      }
      
      if (changed) {
        // Sync check rates after manual updates
        await syncCheckRates("تعديل يدوي");
        
        rates.lastUpdated = new Date().toISOString();
        await saveToSupabase('parallel');
        broadcastRatesUpdate(rates);
        res.json({ success: true, message: "تم تحديث الأسعار بنجاح" });
      } else {
        res.json({ success: true, message: "لم يتم اكتشاف أي تغييرات" });
      }
    } catch (err) {
      console.error("Manual rate update failed:", err);
      res.status(500).json({ success: false, message: "فشل تحديث الأسعار" });
    }
  });

  // --- End Admin API ---

  // API Routes
  app.get("/api/stats/active", (req: express.Request, res: express.Response) => {
    res.json({ count: onlineUsers });
  });

  app.get("/api/status", (req: express.Request, res: express.Response) => {
    const minutesSinceLastScrape = Math.floor((Date.now() - lastSuccessfulScrape.getTime()) / 60000);
    res.json({ 
      status: minutesSinceLastScrape > 30 ? "stale" : "ok",
      lastScrape: lastSuccessfulScrape,
      minutesSinceLastScrape
    });
  });

  app.get("/api/telegram/status", (req: express.Request, res: express.Response) => {
    if (!telegramManager) {
      return res.json({ isConnected: false, lastFetchTime: 0 });
    }
    res.json({ 
      isConnected: telegramManager.isConnected(), 
      lastFetchTime: telegramManager.lastFetchTime 
    });
  });

  app.get("/api/config", (req: express.Request, res: express.Response) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.json({ terms: appConfig.terms });
  });

  app.post("/api/logs/error", async (req: express.Request, res: express.Response) => {
    const { message, stack, context, url, userAgent } = req.body;
    
    // Translation map for common client errors
    let arabicMessage = message;
    if (message?.includes("Failed to fetch")) arabicMessage = "فشل في جلب البيانات من السيرفر (مشكلة اتصال)";
    if (message?.includes("Unexpected token")) arabicMessage = "خطأ في معالجة البيانات المستلمة من السيرفر";
    if (message?.includes("NetworkError")) arabicMessage = "خطأ في الشبكة - تعذر الاتصال";

    console.error("\n[CLIENT ERROR LOG]");
    console.error(`Time: ${new Date().toISOString()}`);
    console.error(`Message: ${message}`);
    console.error(`Context: ${context}`);
    console.error(`URL: ${url}`);
    console.error(`User Agent: ${userAgent}`);
    if (stack) console.error(`Stack: ${stack}`);
    console.error("-------------------\n");

    // Save to Supabase
    await logErrorArabic(arabicMessage || message, context || "تطبيق العميل", stack, url);

    res.status(200).json({ success: true });
  });

  app.get("/api/rates", async (req: express.Request, res: express.Response) => {
    try {
      const force = req.query.refresh === 'true';
      await initializeRatesFromDB(force);
      res.json(rates);
    } catch (err) {
      console.error("Error in /api/rates:", err);
      res.json(rates);
    }
  });

  interface ApiStat {
    timestamp: string;
    ip: string;
    userAgent: string;
    status: number;
    responseTime: number;
  }

  let apiStats = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    bannedIPsCount: 0,
    recentRequests: [] as ApiStat[]
  };

  const publicApiLimiter = rateLimit({
    windowMs: appConfig.apiConfig?.rateLimitWindowMs || 60000,
    max: appConfig.apiConfig?.rateLimitMaxRequests || 20,
    handler: (req, res, next, options) => {
      const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress) as string;
      if (ip) {
        const banDuration = appConfig.apiConfig?.banDurationMinutes || 5;
        bannedIPs.set(ip, Date.now() + banDuration * 60 * 1000);
        console.warn(`[Security] Banned IP ${ip} for ${banDuration} minutes due to rate limit exceeded.`);
        apiStats.bannedIPsCount++;
      }
      apiStats.failedRequests++;
      res.status(options.statusCode).json({ success: false, error: `Too many requests. Your IP is temporarily banned.` });
    },
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.all("/api/public/rates", publicApiLimiter, async (req: express.Request, res: express.Response) => {
    const startTime = Date.now();
    const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress) as string || 'Unknown';
    const userAgent = req.headers['user-agent'] || 'Unknown';
    apiStats.totalRequests++;

    const logRequest = (status: number) => {
      if (status >= 200 && status < 300) {
        apiStats.successfulRequests++;
      } else {
        apiStats.failedRequests++;
      }
      apiStats.recentRequests.unshift({
        timestamp: new Date().toISOString(),
        ip,
        userAgent,
        status,
        responseTime: Date.now() - startTime
      });
      if (apiStats.recentRequests.length > 100) {
        apiStats.recentRequests.pop();
      }
    };

    if (appConfig.apiConfig?.enabled === false) {
      logRequest(503);
      res.status(503).json({ success: false, error: "API is currently disabled by administrator." });
      return;
    }

    // CORS Policy: Allow all origins, but only GET method
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    
    // Handle preflight OPTIONS request
    if (req.method === 'OPTIONS') {
      logRequest(204);
      res.status(204).end();
      return;
    }

    // Restrict to GET method
    if (req.method !== 'GET') {
      logRequest(405);
      res.status(405).json({ success: false, error: "Method Not Allowed. Only GET is supported." });
      return;
    }

    try {
      await initializeRatesFromDB(false);
      
      // Check for stale data (older than 30 minutes)
      const lastUpdatedTime = new Date(rates.lastUpdated).getTime();
      const isStale = (Date.now() - lastUpdatedTime) > (30 * 60 * 1000);
      
      // Set cache control headers to force caching for 1 minute
      res.setHeader('Cache-Control', 'public, max-age=60');
      
      const publicData = {
        success: !isStale,
        stale: isStale,
        data: {
          USD: rates.parallel.USD,
          EUR: rates.parallel.EUR,
        },
        lastUpdated: rates.lastUpdated
      };
      
      if (isStale) {
        // Add a warning message if data is stale
        (publicData as any).warning = "البيانات قديمة جداً ولم يتم تحديثها منذ أكثر من 30 دقيقة.";
      }
      
      logRequest(200);
      res.json(publicData);
    } catch (err) {
      console.error("Error in /api/public/rates:", err);
      logRequest(500);
      res.status(500).json({ success: false, error: "Internal Server Error" });
    }
  });

  app.get("/api/refresh-parallel", async (req: express.Request, res: express.Response) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('X-Robots-Tag', 'noindex');
    res.setHeader('X-Accel-Buffering', 'no');

    const userAgent = req.headers['user-agent'] || 'Unknown';
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const providedKey = req.query.key as string;
    const expectedKey = process.env.CRON_SECRET;
    
    if (!expectedKey || providedKey !== expectedKey) {
      console.warn(`[Cron-Job] Unauthorized refresh attempt from IP: ${ip}`);
      return res.status(403).json({ success: false, error: "Forbidden: Invalid security key" });
    }
    
    console.log(`\n[Cron-Job] Refresh request received!`);
    
    try {
      const startTime = Date.now();
      const oldUsd = rates.parallel.USD;

      // 1. Fetch data from Telegram
      const parallelUpdate = await fetchParallelRatesFromTelegram();
      
      let changed = false;
      if (parallelUpdate) {
        console.log("[Cron-Job] Parallel changes detected! Saving to database...");
        await saveToSupabase('parallel');
        broadcastRatesUpdate(rates);
        changed = true;
      } else {
        console.log("[Cron-Job] Checked parallel sources. No price changes found.");
        // Even if no price changed, we might want to sync memory cache with DB 
        // if memory was lost (e.g. server restart)
        if (rates.parallel.USD < 1) {
          await initializeRatesFromDB(true);
        }
      }
      
      const duration = Date.now() - startTime;
      const newUsd = rates.parallel.USD;
      
      res.status(200).json({ 
        success: true, 
        message: changed ? "Parallel data updated and saved" : "No changes detected, DB stays synced",
        details: {
          duration_ms: duration,
          parallel_usd: { current: newUsd, changed },
          last_sync: new Date().toISOString()
        }
      });
    } catch (err) {
      console.error("[Cron-Job] Parallel refresh failed:", err);
      res.status(500).json({ success: false, error: "Internal server error during refresh" });
    }
  });

  app.get("/api/refresh-official", async (req: express.Request, res: express.Response) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('X-Robots-Tag', 'noindex');
    res.setHeader('X-Accel-Buffering', 'no');

    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const providedKey = req.query.key as string;
    const expectedKey = process.env.CRON_SECRET;
    
    if (!expectedKey || providedKey !== expectedKey) {
      console.warn(`[Cron-Job-Official] Unauthorized refresh attempt from IP: ${ip}`);
      return res.status(403).json({ success: false, error: "Forbidden: Invalid security key" });
    }
    
    console.log(`\n[Cron-Job-Official] Official refresh request received!`);
    
    try {
      const startTime = Date.now();
      const oldOfficial = rates.official.USD;

      // 1. Fetch official rates (CBL + fallbacks)
      const officialUpdate = await fetchOfficialRates();
      
      let changed = false;
      if (officialUpdate) {
        console.log("[Cron-Job-Official] Official changes detected! Saving to database...");
        await saveToSupabase('official');
        broadcastRatesUpdate(rates);
        changed = true;
      } else {
        console.log("[Cron-Job-Official] Checked official sources. No price changes found.");
      }
      
      const duration = Date.now() - startTime;
      const newOfficial = rates.official.USD;
      
      res.status(200).json({ 
        success: true, 
        message: changed ? "Official data updated and saved" : "No changes detected",
        details: {
          duration_ms: duration,
          official_usd: { current: newOfficial, changed },
          last_sync: new Date().toISOString()
        }
      });
    } catch (err) {
      console.error("[Cron-Job-Official] Official refresh failed:", err);
      res.status(500).json({ success: false, error: "Internal server error during official refresh" });
    }
  });

  app.get("/api/cleanup-db", async (req: express.Request, res: express.Response) => {
    const providedKey = req.query.key as string;
    const expectedKey = process.env.CRON_SECRET;
    
    if (!expectedKey || providedKey !== expectedKey) {
      return res.status(403).json({ success: false, error: "Forbidden" });
    }

    if (!supabase || !supabaseAnonKey || supabaseAnonKey.includes('dummy')) {
      return res.status(500).json({ success: false, error: "Database not connected" });
    }

    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const cutoff = sevenDaysAgo.toISOString();

      console.log(`[Maintenance] Manual cleanup triggered. Removing records older than ${cutoff}`);

      // Perform all deletions in parallel
      const [legacyRes, parallelRes, officialRes, logsRes] = await Promise.all([
        supabase.from('exchange_rates').delete({ count: 'exact' }).lt('recorded_at', cutoff),
        supabase.from('parallel_rates').delete({ count: 'exact' }).lt('recorded_at', cutoff),
        supabase.from('official_rates').delete({ count: 'exact' }).lt('recorded_at', cutoff),
        supabase.from('error_logs').delete({ count: 'exact' }).lt('created_at', cutoff)
      ]);

      const removedRates = (legacyRes.count || 0) + (parallelRes.count || 0) + (officialRes.count || 0);
      const removedLogs = logsRes.count || 0;

      if (legacyRes.error || parallelRes.error || officialRes.error || logsRes.error) {
        console.error("Cleanup partial error:", { 
          legacy: legacyRes.error, 
          parallel: parallelRes.error, 
          official: officialRes.error, 
          logs: logsRes.error 
        });
      }

      res.json({
        success: true,
        message: "تم تنظيف كافة جداول قاعدة البيانات بنجاح (سجلات أقدم من أسبوع)",
        details: {
          removed_exchange_rates: legacyRes.count || 0,
          removed_parallel_rates: parallelRes.count || 0,
          removed_official_rates: officialRes.count || 0,
          total_removed_rates: removedRates,
          removed_logs: removedLogs,
          cutoff_date: cutoff
        }
      });
    } catch (err) {
      console.error("[Maintenance] Cleanup failed:", err);
      res.status(500).json({ success: false, error: "Internal server error during cleanup" });
    }
  });

  app.get("/api/recent-changes", async (req: express.Request, res: express.Response) => {
    if (supabase && supabaseAnonKey && !supabaseAnonKey.includes('dummy')) {
      try {
        const { data, error } = await supabase
          .from('price_changes_log')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(200);
          
        if (!error && data) {
          return res.json(data.map(d => ({
            id: d.id,
            currencyCode: d.currency_code,
            currencyName: d.currency_name,
            oldPrice: d.old_price,
            newPrice: d.new_price,
            source: d.source,
            timestamp: d.created_at
          })));
        }
      } catch (e) {
        console.error("Failed to fetch price changes from Supabase", e);
      }
    }
    res.json(recentChangesLog);
  });

  app.delete("/api/admin/recent-changes", requireAdmin, async (req: express.Request, res: express.Response) => {
    recentChangesLog.length = 0; // Clear memory cache
    if (supabase && supabaseAnonKey && !supabaseAnonKey.includes('dummy')) {
      try {
        // Delete all records
        await supabase.from('price_changes_log').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      } catch (e) {
        console.error("Failed to clear price changes in Supabase", e);
      }
    }
    res.json({ success: true });
  });


  app.get("/api/health", async (req: express.Request, res: express.Response) => {
    res.json({
      status: "online",
      uptime: Math.round((new Date().getTime() - serverStartTime.getTime()) / 1000),
      telegram: activeClient?.connected || false,
      timestamp: new Date().toISOString()
    });
  });

  app.get("/api/history", async (req: express.Request, res: express.Response) => {
    try {
      const dbHistory = await fetchHistoryFromSupabase();
      res.json(dbHistory);
    } catch (err) {
      res.json(history);
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    
    // Initial scrape on startup (with delay to avoid AUTH_KEY_DUPLICATED when Render restarts)
    (async () => {
      try {
        console.log("[Startup] Waiting 30s for system to settle and old sessions to clear...");
        await new Promise(resolve => setTimeout(resolve, 30000));
        
        console.log("[Startup] Triggering initial rates update...");
        await fetchOfficialRates();
        await fetchParallelRatesFromTelegram();
      } catch (err) {
        console.error("[Startup] Error during initial update:", err);
      }
    })();
    
    // Auto-refresh rates every 10 minutes as long as server is awake
    setInterval(async () => {
      try {
        console.log("[Auto-Refresh] Triggering automatic rates update...");
        await fetchOfficialRates();
        await fetchParallelRatesFromTelegram();
      } catch (err) {
        console.error("[Auto-Refresh] Error during automatic update:", err);
      }
    }, 10 * 60 * 1000);

    // Keep-alive ping for Render Free Tier (pings itself every 4 minutes)
    // This combined with external cron-job.org ensures 24/7 uptime
    setInterval(() => {
      const publicUrl = process.env.APP_URL || `http://localhost:${PORT}`;
      const url = `${publicUrl}/api/health`;
      console.log(`[Keep-Alive] Pinging ${url} to prevent hibernation...`);
      fetch(url).catch(() => {});
    }, 4 * 60 * 1000);
  });
}

// Global Reconnection Monitoring
let isMonitoring = false;
async function startMonitoring() {
  if (isMonitoring) return;
  isMonitoring = true;
  // Reduced frequency to avoid connection conflicts
  setInterval(async () => {
     try {
       // Only attempt if not already connected
       if (!activeClient || !activeClient.connected) {
         console.log("[Reconnector] Telegram disconnected or not initialized, attempting reconnect...");
         await initializeTelegram();
       }
     } catch (e) {
       console.warn("[Reconnector] Stealth reconnection failed, will retry next cycle.");
     }
  }, 15 * 60 * 1000); // 15 mins
}
startMonitoring();

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
