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
import { GoogleGenAI } from "@google/genai";

// Initialize AI lazily
let aiClient: GoogleGenAI | null = null;
function getAIClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("CRITICAL: GEMINI_API_KEY not set.");
  }
  if (!aiClient && apiKey) {
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

// Initialize Supabase client for server
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY; 

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("WARNING: Supabase credentials missing from environment variables.");
}

// Only create client if key is provided to avoid crashing on startup
const supabase = supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

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
    TND: 3.30,
    TRY: 0.23,
    EGP: 0.19,
    JOD: 15.10,
    BHD: 28.50,
    KWD: 35.00,
    AED: 2.90,
    SAR: 2.85,
    QAR: 2.90,
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

// Helper to detect significant price changes (ignores tiny floating point noise)
function isSignificantChange(val1: number, val2: number, threshold = 0.0001) {
  return Math.abs((val1 || 0) - (val2 || 0)) > threshold;
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

    // 3. Fallback: Save to legacy table for backward compatibility during transition
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
    // Fetch parallel and official history in parallel for speed
    const [parallelRes, officialRes] = await Promise.all([
      supabase.from('parallel_rates').select('recorded_at, usd, rates').order('recorded_at', { ascending: false }).limit(1000),
      supabase.from('official_rates').select('recorded_at, usd, rates').order('recorded_at', { ascending: false }).limit(1000)
    ]);

    // Check for "table not found" errors - fallback to legacy if tables are missing
    if (parallelRes.error?.message.includes('relation "parallel_rates" does not exist') || 
        officialRes.error?.message.includes('relation "official_rates" does not exist')) {
        
        const { data, error } = await supabase.from('exchange_rates').select('*').order('recorded_at', { ascending: false }).limit(1000);
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

    // Merge strategy: We want a continuous timeline. 
    // Since parallel and official points might not align in time, we create a unified map of timestamps
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

    // Sort by time and fill gaps (e.g. if a parallel point has no official data, use the closest previous official)
    const sortedPoints = Array.from(timelineMap.values()).sort((a, b) => 
      new Date(a.time!).getTime() - new Date(b.time!).getTime()
    );

    let lastParallel: any = rates.parallel;
    let lastOfficial: any = rates.official;
    
    // Reverse filling is tricky for charts, usually we just want to ensure each point has both for the frontend
    // but the frontend is designed to handle missing values or we can interpolate.
    // For now, let's just ensure they exist to avoid crashes.
    const completedHistory = sortedPoints.map(p => ({
      time: p.time!,
      usdParallel: p.usdParallel || 0,
      usdOfficial: p.usdOfficial || 0,
      ratesParallel: p.ratesParallel || {},
      ratesOfficial: p.ratesOfficial || {}
    })) as HistoryPoint[];

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

// Smart AI extraction function that parses complex Arabic messages
// Uses Gemini AI to identify currency codes and extract the SELL price (second number)
async function extractRatesWithAI(text: string): Promise<Record<string, number> | null> {
  // Build a map of all known terms for context
  const termsContext = appConfig.terms.map(t => `${t.id}: ${t.name} (${t.flag}), min:${t.min}, max:${t.max}`).join('\n');

  // --- Strategy 1: Regex-based client-side extraction (fast, no API needed) ---
  // Tries to parse the tabular format: ID/keyword buy_price sell_price [status] [date]
  const clientExtracted: Record<string, number> = {};

  // Pattern: <keyword or ID> <optional words> <buy_price> <sell_price>
  const linePattern = /^[\d\s]*(.+?)\s+([\d,\.]+)\s+([\d,\.]+)\s*(up|down|fixed)?/gim;
  let lineMatch: RegExpExecArray | null;

  while ((lineMatch = linePattern.exec(text)) !== null) {
    const rawText = lineMatch[1].trim();
    const buyStr  = lineMatch[2];
    const sellStr = lineMatch[3];

    const buyVal  = parseFloat(buyStr.replace(',', '.'));
    const sellVal = parseFloat(sellStr.replace(',', '.'));

    if (isNaN(sellVal) || sellVal <= 0) continue;

    // Try to match this line's text against our known terms
    for (const term of appConfig.terms) {
      // Check ID directly (case-insensitive)
      if (rawText.toLowerCase().includes(term.id.toLowerCase())) {
        if (!clientExtracted[term.id] && sellVal >= term.min && sellVal <= term.max) {
          clientExtracted[term.id] = sellVal;
        }
        break;
      }
      // Check keywords from regex
      try {
        const keywordMatch = term.regex.match(/^\(\?:([^)]+)\)/);
        if (keywordMatch) {
          const keywords = keywordMatch[1].split('|');
          const matched = keywords.some(kw => rawText.includes(kw));
          if (matched && !clientExtracted[term.id] && sellVal >= term.min && sellVal <= term.max) {
            clientExtracted[term.id] = sellVal;
            break;
          }
        }
      } catch (e) { /* ignore regex parse errors */ }
    }
  }

  if (Object.keys(clientExtracted).length > 0) {
    console.log(`[AI-Extract] Client-side regex extracted ${Object.keys(clientExtracted).length} prices quickly.`);
    return clientExtracted;
  }

  // --- Strategy 2: Gemini AI (for complex/ambiguous messages) ---
  const ai = getAIClient();
  if (!ai) {
    console.warn('[AI-Extract] Gemini client not available, returning client-side results.');
    return Object.keys(clientExtracted).length > 0 ? clientExtracted : null;
  }

  try {
    const prompt = `أنت مساعد ذكي لاستخراج أسعار الصرف من رسائل السوق الليبي.
قواعد ذهبية للاستخراج:
1. العملات تأتي غالباً بنوعين: "كاش" (نقدي) و "صكوك" (شيكات مصارف).
2. في كل فئة (كاش أو صكوك)، قد يوجد سعران: السعر الأول هو الشراء، والثاني هو البيع. نحن نريد دائماً "سعر البيع" (الرقم الثاني في الفئة).
3. انتبه جداً: لا تخلط بين سعر الكاش وسعر الصكوك. إذا طلبت منك "USD" فأنا أريد سعره "كاش". إذا طلبت "USD_JBANK" فأنا أريد سعره بصكوك مصرف الجمهورية وهكذا.
4. بالنسبة للعملات مثل التونسي (TND) والمصري (EGP)، قد تكتب بصيغة (0.33) أو (3.3). استخرج الرقم كما هو ولا تقم بعمليات حسابية.

قائمة العملات ومعرفاتها (ID):
${termsContext}

النص للتحليل:
"""
${text}
"""

أرجع JSON فقط بمفاتيح الـ ID وقيم الأسعار المستخرجة (سعر البيع لكل فئة):
{
  "USD": 10.2775,
  "USD_JBANK": 11.1775,
  ...
}
تنبيه: أعد JSON فقط بدون أي شرح أو علامات markdown إضافية.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
    });

    const rawText = response.text?.trim() || '';
    // Clean the response (remove markdown code blocks if any)
    const clean = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    try {
      const parsed = JSON.parse(clean);
      if (typeof parsed === 'object' && parsed !== null) {
        // Validate against min/max constraints
        const validated: Record<string, number> = {};
        for (const [key, val] of Object.entries(parsed)) {
          const numVal = Number(val);
          const term = appConfig.terms.find(t => t.id === key);
          if (term && !isNaN(numVal) && numVal >= term.min && numVal <= term.max) {
            validated[key] = numVal;
          }
        }
        if (Object.keys(validated).length > 0) {
          console.log(`[AI-Extract] Gemini extracted ${Object.keys(validated).length} prices.`);
          return validated;
        }
      }
    } catch (parseErr) {
      console.error('[AI-Extract] Failed to parse Gemini response as JSON:', rawText);
      return { _raw: rawText } as any;
    }
  } catch (aiErr: any) {
    console.error('[AI-Extract] Gemini call failed:', aiErr.message);
    throw aiErr;
  }

  return null;
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
          // Extract the "Average" (المتوسط) rate
          // Looking for the number after the "المتوسط:" span
          const rateMatch = targetRow.match(/المتوسط:\s*<\/span>\s*([\d.]+)/i);
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
  terms: [
    { id: "USD", name: "دولار أمريكي", regex: "(?:الدولار|دولار|الخضراء|خضراء|كاش|💵|🇺🇸)(?!\\s*صكوك|\\s*بصك|\\s*شيك)[^\\d]{0,15}(\\d{1,2}(?:[\\.,]\\d{1,4})?)(?:\\s+(\\d{1,2}(?:[\\.,]\\d{1,4})?))?", min: 5.0, max: 25.0, isInverse: false, flag: "us" },
    { id: "EUR", name: "يورو", regex: "(?:يورو|اليورو|💶|eur|🇪🇺)[^\\d]{0,25}(\\d{1,2}(?:[\\.,]\\d{1,4})?)(?:\\s+(\\d{1,2}(?:[\\.,]\\d{1,4})?))?", min: 5.0, max: 25.0, isInverse: false, flag: "eu" },
    { id: "GBP", name: "جنيه إسترليني", regex: "(?:باوند|استرليني|الباوند|💷|gbp|🇬🇧)[^\\d]{0,25}(\\d{1,2}(?:[\\.,]\\d{1,4})?)(?:\\s+(\\d{1,2}(?:[\\.,]\\d{1,4})?))?", min: 5.0, max: 25.0, isInverse: false, flag: "gb" },
    { id: "TND", name: "دينار تونسي", regex: "(?:(?:تونسي|تونس|tnd|🇹🇳)[^\\d]{0,25}(\\d{1,2}(?:[\\.,]\\d{1,4})?)(?:\\s+(\\d{1,2}(?:[\\.,]\\d{1,4})?))?)|(?:(\\d{1,2}(?:[\\.,]\\d{1,4})?)(?:\\s+(\\d{1,2}(?:[\\.,]\\d{1,4})?))?[^\\d]{0,25}(?:تونسي|تونس|tnd|🇹🇳))", min: 0.1, max: 10.0, isInverse: false, flag: "tn" },
    { id: "EGP", name: "جنيه مصري", regex: "(?:(?:مصري|مصر|egp|🇪🇬)[^\\d]{0,25}(\\d{1,2}(?:[\\.,]\\d{1,4})?)(?:\\s+(\\d{1,2}(?:[\\.,]\\d{1,4})?))?)|(?:(\\d{1,2}(?:[\\.,]\\d{1,4})?)(?:\\s+(\\d{1,2}(?:[\\.,]\\d{1,4})?))?[^\\d]{0,25}(?:مصري|مصر|egp|🇪🇬))", min: 0.01, max: 5.0, isInverse: false, flag: "eg" },
    { id: "TRY", name: "ليرة تركية", regex: "(?:(?:ليرة|تركي|try|🇹🇷)[^\\d]{0,25}(\\d{1,2}(?:[\\.,]\\d{1,4})?)(?:\\s+(\\d{1,2}(?:[\\.,]\\d{1,4})?))?)|(?:(\\d{1,2}(?:[\\.,]\\d{1,4})?)(?:\\s+(\\d{1,2}(?:[\\.,]\\d{1,4})?))?[^\\d]{0,25}(?:ليرة|تركي|try|🇹🇷))", min: 0.01, max: 5.0, isInverse: false, flag: "tr" },
    { id: "JOD", name: "دينار أردني", regex: "(?:jod|JOD|أردني|🇯🇴)[^\\d]{0,25}(\\d{1,2}(?:[\\.,]\\d{1,4})?)(?:\\s+(\\d{1,2}(?:[\\.,]\\d{1,4})?))?", min: 5.0, max: 30.0, isInverse: false, flag: "jo" },
    { id: "BHD", name: "دينار بحريني", regex: "(?:bhd|BHD|بحريني|🇧🇭)[^\\d]{0,25}(\\d{1,2}(?:[\\.,]\\d{1,4})?)(?:\\s+(\\d{1,2}(?:[\\.,]\\d{1,4})?))?", min: 10.0, max: 50.0, isInverse: false, flag: "bh" },
    { id: "KWD", name: "دينار كويتي", regex: "(?:kwd|KWD|كويتي|🇰🇼)[^\\d]{0,25}(\\d{1,2}(?:[\\.,]\\d{1,4})?)(?:\\s+(\\d{1,2}(?:[\\.,]\\d{1,4})?))?", min: 10.0, max: 60.0, isInverse: false, flag: "kw" },
    { id: "AED", name: "درهم إماراتي", regex: "(?:aed|AED|إماراتي|امارات|🇦🇪)[^\\d]{0,25}(\\d{1,2}(?:[\\.,]\\d{1,4})?)(?:\\s+(\\d{1,2}(?:[\\.,]\\d{1,4})?))?", min: 0.5, max: 10.0, isInverse: false, flag: "ae" },
    { id: "SAR", name: "ريال سعودي", regex: "(?:sar|SAR|سعودي|ريال|🇸🇦)[^\\d]{0,25}(\\d{1,2}(?:[\\.,]\\d{1,4})?)(?:\\s+(\\d{1,2}(?:[\\.,]\\d{1,4})?))?", min: 0.5, max: 10.0, isInverse: false, flag: "sa" },
    { id: "QAR", name: "ريال قطري", regex: "(?:qar|QAR|قطري|🇶🇦)[^\\d]{0,25}(\\d{1,2}(?:[\\.,]\\d{1,4})?)(?:\\s+(\\d{1,2}(?:[\\.,]\\d{1,4})?))?", min: 0.5, max: 10.0, isInverse: false, flag: "qa" },
    { id: "USD_JBANK", name: "صكوك الجمهورية", regex: "(?:jbank|الجمهورية|صكوك|بصك)[^\\d]{0,25}(\\d{1,2}(?:[\\.,]\\d{1,4})?)(?:\\s+(\\d{1,2}(?:[\\.,]\\d{1,4})?))?", min: 5.0, max: 25.0, isInverse: false, flag: "us" },
    { id: "USD_BCD", name: "صكوك التجارة", regex: "(?:bcd|التجارة والتنمية)[^\\d]{0,25}(\\d{1,2}(?:[\\.,]\\d{1,4})?)(?:\\s+(\\d{1,2}(?:[\\.,]\\d{1,4})?))?", min: 5.0, max: 25.0, isInverse: false, flag: "us" },
    { id: "USD_NCB", name: "صكوك التجاري", regex: "(?:NCB|التجاري الوطني|صكوك|بصك)[^\\d]{0,25}(\\d{1,2}(?:[\\.,]\\d{1,4})?)(?:\\s+(\\d{1,2}(?:[\\.,]\\d{1,4})?))?", min: 5.0, max: 25.0, isInverse: false, flag: "us" },
    { id: "USD_AB", name: "صكوك الأمان", regex: "(?:AB|الأمان|الامان)[^\\d]{0,25}(\\d{1,2}(?:[\\.,]\\d{1,4})?)(?:\\s+(\\d{1,2}(?:[\\.,]\\d{1,4})?))?", min: 5.0, max: 25.0, isInverse: false, flag: "us" },
    { id: "USD_WB", name: "صكوك الوحدة", regex: "(?:WB|الوحدة)[^\\d]{0,25}(\\d{1,2}(?:[\\.,]\\d{1,4})?)(?:\\s+(\\d{1,2}(?:[\\.,]\\d{1,4})?))?", min: 5.0, max: 25.0, isInverse: false, flag: "us" },
    { id: "USD_AE", name: "حوالات دبي", regex: "(?:دبي|امارات|الإمارات|🇦🇪)[^\\d]{0,25}(\\d{1,2}(?:[\\.,]\\d{1,4})?)(?:\\s+(\\d{1,2}(?:[\\.,]\\d{1,4})?))?", min: 5.0, max: 25.0, isInverse: false, flag: "ae" },
    { id: "USD_TR", name: "حوالات تركيا", regex: "(?:تركيا|تركي|🇹🇷)[^\\d]{0,25}(\\d{1,2}(?:[\\.,]\\d{1,4})?)(?:\\s+(\\d{1,2}(?:[\\.,]\\d{1,4})?))?", min: 5.0, max: 25.0, isInverse: false, flag: "tr" },
    { id: "USD_CN", name: "حوالات الصين", regex: "(?:الصين|صينية|🇨🇳)[^\\d]{0,25}(\\d{1,2}(?:[\\.,]\\d{1,4})?)(?:\\s+(\\d{1,2}(?:[\\.,]\\d{1,4})?))?", min: 5.0, max: 25.0, isInverse: false, flag: "cn" },
    { id: "CNY", name: "يوان صيني", regex: "(?:cny|CNY|يوان|🇨🇳)[^\\d]{0,25}(\\d{1,2}(?:[\\.,]\\d{1,4})?)(?:\\s+(\\d{1,2}(?:[\\.,]\\d{1,4})?))?", min: 0.5, max: 5.0, isInverse: false, flag: "cn" },
    { id: "GOLD", name: "كسر الذهب", regex: "(?:كسر الذهب|ذهبي|ذهب|💎)[^\\d]{0,25}(\\d{2,4}(?:[\\.,]\\d+)?)", min: 100, max: 5000, isInverse: false, flag: "ly" },
    { id: "OFFICIAL_USD", name: "الدولار الرسمي", regex: "(?:الرسمي|المركزي)[^\\d]{0,25}(\\d{1,2}(?:[\\.,]\\d{1,4})?)", min: 4.0, max: 6.0, isInverse: false, flag: "us" }
  ]
};

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

      appConfig = dbConfig;
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
let lastSuccessfulScrape = new Date();

async function fetchParallelRatesFromTelegram() {
  try {
    const priceHistory: Record<string, { value: number, time: number, channel: string }[]> = {};
    for (const term of appConfig.terms) {
      priceHistory[term.id] = [];
    }

    // Parallel Fetching for speed (Scraper Optimization)
    let successfulChannels = 0;
    let totalMessagesProcessed = 0;

    const scrapeResults = await Promise.allSettled(appConfig.channels.map(async (channel) => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        const response = await fetch(`https://t.me/s/${channel}`, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (!response.ok) return null;
        const html = await response.text();
        return { channel, html };
        } catch (e) {
          console.error(`Failed to fetch ${channel}:`, e);
          await logErrorArabic(`فشل الاتصال بقناة تيليجرام: ${channel}`, "الكاشط", String(e));
          return null;
        }
    }));

    for (const result of scrapeResults) {
      if (result.status === 'fulfilled' && result.value) {
        const { channel, html } = result.value;
        const messageBlocks = html.split('tgme_widget_message_wrap');
        
        if (messageBlocks.length > 1) {
          successfulChannels++;
          totalMessagesProcessed += (messageBlocks.length - 1);
        }

        let newestMessageInChannel = { text: '', time: 0 };

        for (const block of messageBlocks) {
          const textMatch = block.match(/<div class="tgme_widget_message_text[^>]*>(.*?)<\/div>/);
          const timeMatch = block.match(/<time datetime="([^"]+)"/);
          
          if (textMatch && timeMatch) {
            const cleanText = textMatch[1].replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ');
            const time = new Date(timeMatch[1]).getTime();
            if (Date.now() - time > 48 * 60 * 60 * 1000) continue;

            if (time > newestMessageInChannel.time) {
              newestMessageInChannel = { text: cleanText, time };
            }

            const extractRate = (regexStr: string, key: string, min: number, max: number, isInverse = false) => {
              const regex = new RegExp(regexStr, 'i');
              const match = cleanText.match(regex);
              if (!match) return;

              // Logic to pick the correct capture group
              // For our new regexes:
              // match[1] = first number (after name)
              // match[2] = second number (after name)
              // match[3] = first number (before name)
              // match[4] = second number (before name)
              
              let valStr = null;
              
              const partAfterFirstNum = match[0].split(match[1])[1] || "";
              const hasCategorySeparator = /صكوك|بصك|شيك|مصرف|مقاصة/i.test(partAfterFirstNum);

              if (match[2] && !hasCategorySeparator) {
                valStr = match[2]; // Second number is Sell ONLY if no new category keyword is between them
              } else if (match[4]) {
                valStr = match[4]; 
              } else {
                valStr = match[1] || match[3];
              }
              
              if (valStr) {
                let val = parseFloat(valStr.replace(',', '.'));
                
                // Smart inverse logic for TND, EGP, and TRY
                if (key === 'TND' && val < 1.0 && val > 0) val = 1 / val;
                if (key === 'EGP' && val > 1.0) val = 1 / val;
                if (key === 'TRY' && val > 1.0) val = 1 / val;
                
                if (isInverse && val > 0) val = 1 / val;
                if (!isNaN(val) && val > min && val < max) {
                  priceHistory[key].push({ value: val, time, channel });
                }
              }
            };

            for (const term of appConfig.terms) {
              extractRate(term.regex, term.id, term.min, term.max, term.isInverse);
            }
          }
        }

        // AI Extraction for the newest message in this channel (Smart Background Processing)
        // Optimization: Only call AI if regex failed to find rates in this message, or if it's a complex message
        if (newestMessageInChannel.text && (Date.now() - newestMessageInChannel.time < 12 * 60 * 60 * 1000)) {
          // Check if regex already found something for this specific message time
          const regexFoundSomething = Object.values(priceHistory).some(history => 
            history.some(p => p.time === newestMessageInChannel.time && p.channel === channel)
          );

          if (!regexFoundSomething) {
            try {
              const aiRates = await extractRatesWithAI(newestMessageInChannel.text);
              if (aiRates) {
                for (const key in aiRates) {
                  if (priceHistory[key]) {
                    // Only add if not already caught by regex or if it's a different value
                    const exists = priceHistory[key].some(p => p.time === newestMessageInChannel.time && Math.abs(p.value - aiRates[key]) < 0.001);
                    if (!exists) {
                      priceHistory[key].push({ value: aiRates[key], time: newestMessageInChannel.time, channel: `${channel} (AI)` });
                    }
                  }
                }
              }
            } catch (aiErr) {
              console.error(`AI extraction failed for ${channel}, falling back to regex results:`, aiErr);
            }
          }
        }
      }
    }

    if (successfulChannels > 0) {
      lastSuccessfulScrape = new Date();
      console.log(`[Scraper] Successfully processed ${totalMessagesProcessed} messages from ${successfulChannels} channels.`);
    } else {
      console.warn("[Scraper] Failed to fetch any messages from any channels.");
    }

    const latestRates: Record<string, number> = {};
    const previousRates: Record<string, number> = {};
    let newestMessageTime = 0;

    for (const key in priceHistory) {
      // Sort: Newest first, but if times are equal, prefer our owner channel 'djheih2026'
      const historyArr = priceHistory[key].sort((a, b) => {
        if (b.time !== a.time) return b.time - a.time;
        if (b.channel === "djheih2026") return 1;
        if (a.channel === "djheih2026") return -1;
        return 0;
      });
      
      if (historyArr.length > 0) {
        latestRates[key] = historyArr[0].value; // Newest price (with owner preference)
        const msgTime = historyArr[0].time;
        if (msgTime > newestMessageTime) {
          newestMessageTime = msgTime;
        }
        
        // Find the true previous price
        for (let i = 1; i < historyArr.length; i++) {
          if (historyArr[i].value !== latestRates[key]) {
            previousRates[key] = historyArr[i].value;
            break;
          }
        }
      }
    }

    const foundKeys = Object.keys(latestRates);
    if (foundKeys.length > 0) {
      console.log(`[Scraper] Scrape check completed. Found rates for: ${foundKeys.join(', ')}`);
      
      let anyChanged = false;
      const primaryUsd = latestRates.USD || rates.parallel.USD;

      // Dynamically assign all extracted rates
      for (const term of appConfig.terms) {
        const currentVal = rates.parallel[term.id];
        const newVal = latestRates[term.id];

        if (newVal) {
          // Update lastChanged only if the price actually changed
          if (isSignificantChange(currentVal, newVal)) {
            console.log(`[Scraper] Price change detected for ${term.id}: ${currentVal} -> ${newVal}`);
            rates.previousParallel[term.id] = currentVal;
            rates.parallel[term.id] = newVal;
            rates.lastChanged.parallel[term.id] = new Date().toISOString();
            anyChanged = true;
          }
        } else if (!currentVal) {
          // Initialize with some fallback if it doesn't exist at all (initial setup)
          const fallbackValue = 
            term.id === "USD_CHECKS" ? primaryUsd + 0.8 :
            term.id === "EUR" ? primaryUsd * 1.08 :
            term.id === "GBP" ? primaryUsd * 1.26 :
            term.id === "GOLD" ? 1280 :
            (term.id === "USD_TR" || term.id === "USD_AE") ? primaryUsd :
            term.id === "TND" ? primaryUsd * 0.32 :
            term.id === "TRY" ? primaryUsd * 0.03 :
            term.id === "EGP" ? primaryUsd * 0.02 :
            term.id === "OFFICIAL_USD" ? rates.official.USD : 0;
          
          rates.parallel[term.id] = fallbackValue;
          rates.lastChanged.parallel[term.id] = new Date().toISOString();
          anyChanged = true;
        }
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
    
    // 1. Clean up error_logs older than 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { error: errLogsError } = await supabase
      .from('error_logs')
      .delete()
      .lt('created_at', sevenDaysAgo);
      
    if (errLogsError && errLogsError.code !== '42P01') {
      console.error("Error cleaning up error_logs:", errLogsError);
    }

    // 2. Clean up exchange_rates older than 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { error: ratesError } = await supabase
      .from('exchange_rates')
      .delete()
      .lt('recorded_at', thirtyDaysAgo);

    if (ratesError && ratesError.code !== '42P01') {
      console.error("Error cleaning up exchange_rates:", ratesError);
    }

    console.log("Database cleanup completed.");
  } catch (error) {
    console.error("Failed to run database cleanup:", error);
  }
};

// Run cleanup once on startup, then every 24 hours
cleanupOldData();
setInterval(cleanupOldData, 24 * 60 * 60 * 1000);

async function startServer() {
  const app = express();
  const server = createServer(app);
  const PORT = process.env.PORT || 3000;

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

  app.use(express.json());
  app.set('trust proxy', 1);

  // Security Headers
  app.use(helmet({
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: false,
    frameguard: false,
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        "img-src": ["'self'", "data:", "https://flagcdn.com", "https://hatscripts.github.io", "https://picsum.photos", "https://*.supabase.co", "https://*.google.com", "https://*.gstatic.com"],
        "connect-src": ["'self'", "https://open.er-api.com", "https://t.me", "https://*.supabase.co", "wss:", "ws:", "https://*.google.com", "https://*.gstatic.com", "https://*.googleapis.com"],
        "script-src": ["'self'", "'unsafe-inline'", "'unsafe-eval'", "blob:", "https://*.google.com", "https://*.gstatic.com"],
        "font-src": ["'self'", "https://fonts.gstatic.com", "data:", "https://*.googleapis.com"],
        "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://*.gstatic.com"],
        "frame-ancestors": ["*"],
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

  app.get("/api/admin/config", requireAdmin, (req: express.Request, res: express.Response) => {
    res.json(appConfig);
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
      }
      
      res.json({ success: true, message: "تم حفظ الإعدادات بنجاح" });
    } catch (err) {
      console.error("Error saving config:", err);
      res.status(500).json({ success: false, message: "حدث خطأ أثناء الحفظ" });
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

  app.get("/api/admin/stats", requireAdmin, async (req: express.Request, res: express.Response) => {
    const minutesSinceLastScrape = Math.floor((Date.now() - lastSuccessfulScrape.getTime()) / 60000);
    res.json({
      onlineUsers,
      lastSuccessfulScrape: lastSuccessfulScrape.toISOString(),
      minutesSinceLastScrape,
      channelsCount: appConfig.channels.length,
      termsCount: appConfig.terms.length,
      serverUptime: process.uptime(),
      memoryUsage: process.memoryUsage()
    });
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

  app.get("/api/admin/ai-status", requireAdmin, async (req: express.Request, res: express.Response) => {
    try {
      const ai = getAIClient();
      if (!ai) {
        return res.json({ success: false, message: "AI Client not initialized" });
      }
      
      // Simple test to verify the key works
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: "Say 'OK' if you are connected.",
      });
      
      if (response.text) {
        res.json({ success: true, message: "AI is connected and working", response: response.text });
      } else {
        res.json({ success: false, message: "AI returned empty response" });
      }
    } catch (err: any) {
      console.error("AI Status Check Error:", err);
      res.json({ success: false, message: "AI connection failed", error: err.message });
    }
  });

  app.post("/api/admin/ai-extract", requireAdmin, async (req: express.Request, res: express.Response) => {
    try {
      const { text } = req.body;
      if (!text) {
        return res.status(400).json({ success: false, message: "No text provided" });
      }
      
      const extractedRates = await extractRatesWithAI(text);
      if (extractedRates && !extractedRates._raw) {
        res.json({ success: true, extractedRates });
      } else if (extractedRates && extractedRates._raw) {
        res.json({ success: false, message: "لم يتمكن المساعد من استخراج أي أسعار. استجابة المساعد: " + extractedRates._raw });
      } else {
        res.json({ success: false, message: "لم يتمكن المساعد من استخراج أي أسعار من النص المدخل" });
      }
    } catch (err: any) {
      console.error("AI extraction failed:", err);
      // Send the actual error message to the client so the user knows what's wrong
      res.status(500).json({ success: false, message: `خطأ في المساعد الذكي: ${err.message || 'فشل الاتصال'}` });
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
            rates.previousParallel[key] = rates.parallel[key] || numValue;
            rates.parallel[key] = numValue;
            rates.lastChanged.parallel[key] = new Date().toISOString();
            changed = true;
          }
        }
      }
      
      if (changed) {
        rates.lastUpdated = new Date().toISOString();
        await saveToSupabase('parallel');
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
  app.get("/api/online-count", (req: express.Request, res: express.Response) => {
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

  app.get("/api/config", (req: express.Request, res: express.Response) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.json({ terms: appConfig.terms });
  });

  app.post("/api/logs/error", (req: express.Request, res: express.Response) => {
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
    logErrorArabic(arabicMessage || message, context || "تطبيق العميل", stack, url);

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

  app.get("/api/refresh", async (req: express.Request, res: express.Response) => {
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
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
      const cutoff = twoDaysAgo.toISOString();

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
        message: "تم تنظيف كافة جداول قاعدة البيانات بنجاح (سجلات أقدم من يومين)",
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

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
