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

// Initialize AI
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

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

/**
 * AI-powered rate extraction from text
 * Uses Gemini to intelligently parse complex or unstructured messages
 */
async function extractRatesWithAI(text: string) {
  if (!process.env.GEMINI_API_KEY) return null;
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-latest",
      contents: `You are a High-Intelligence Financial Analyst specialized in the Libyan Foreign Exchange Market. 
      Your goal is to perform a deep semantic analysis of Telegram messages to extract currency rates with 100% accuracy.

      CORE INTELLIGENCE REQUIREMENTS:
      1. DEEP SEMANTIC UNDERSTANDING: Understand the full context. Even if grammar is broken or text is fragmented, reconstruct the intended meaning.
      2. OFFICIAL VS PARALLEL DISTINCTION:
         - OFFICIAL (الرسمي): Keywords: مصرف ليبيا المركزي، رسمي، مركزي، منظومة، سعر المصرف. 
         - If the message is from the Central Bank or mentions "Official Rates", map the USD rate to "OFFICIAL_USD".
         - In official tables, the first numerical value after the currency name is the BUY rate (سعر الشراء). Use this value.
         - Example Official: "8  الدولار الأمريكي  6.4324  6.4003" -> OFFICIAL_USD is 6.4324.
         - PARALLEL (الموازي): Default market. Keywords: كاش، في اليد، السوق، خضراء، سوق موازي.
         - In parallel market tables (like the one below), the first numerical value after the currency name is the SELL rate (سعر البيع). Use this value.
         - Example Parallel: "USD دولار مدينة مصراته 10.7900 10.7875" -> USD is 10.7900.
         - Example Parallel: "jbank دولار صكوك الجمهورية 11.6000 11.5975" -> USD_JBANK is 11.6000.
      3. LINGUISTIC FLEXIBILITY: Understand Libyan dialect and shorthand. Typos are signals to be interpreted.
      4. NUMERICAL PRECISION: Extract numbers regardless of format (Arabic ٠-٩ or Western 0-9).

      MESSAGE TO ANALYZE:
      "${text}"

      MAPPING LOGIC:
      - If message is OFFICIAL/BANK (مصرف ليبيا المركزي):
        - "الدولار الأمريكي" -> OFFICIAL_USD
        - "اليورو" -> OFFICIAL_EUR
        - "الجنيه الاسترليني" -> OFFICIAL_GBP
        - "الدينار التونسي" -> OFFICIAL_TND
        - "الريال السعودي" -> OFFICIAL_SAR
        - "الدرهم الاماراتي" -> OFFICIAL_AED
        - "الليرة التركية" -> OFFICIAL_TRY
        - "الايوان الصيني" -> OFFICIAL_CNY
      - If message is PARALLEL/MARKET (سوق موازي):
        - "الدولار" / "usd" / "مصراته" -> USD
        - "يورو" / "eur" -> EUR
        - "استرليني" / "gbp" -> GBP
        - "تونسي" / "tnd" -> TND
        - "مصري" / "egp" -> EGP
        - "ليرة تركية" / "try" -> TRY
        - "أردني" / "jod" -> JOD
        - "صكوك الجمهورية" / "jbank" -> USD_JBANK
        - "صكوك التجاري" / "ncb" -> USD_NCB
        - "صكوك التجارة" / "bcd" -> USD_BCD
        - "صكوك الأمان" / "ab" -> USD_AB
        - "صكوك الوحدة" / "wb" -> USD_WB
        - "حوالة دبي" / "ae" -> USD_AE
        - "حوالة تركيا" / "tr" -> USD_TR
        - "حوالة الصين" / "cn" -> USD_CN
        - IMPORTANT: If a generic "Cheque" (صك) or "Cheques" (صكوك) rate is mentioned without a specific bank, or if it's a general market cheque rate, apply that value to BOTH "USD_JBANK" and "USD_NCB".
      - General Mapping (Parallel):
        - "يورو" -> EUR, "باوند" -> GBP, "تونسي" -> TND, "مصري" -> EGP, "ليرة" -> TRY, "أردني" -> JOD, "بحريني" -> BHD, "كويتي" -> KWD, "إماراتي" -> AED, "سعودي" -> SAR, "قطري" -> QAR, "يوان" -> CNY, "ذهب" -> GOLD
        - "صكوك الجمهورية" -> USD_JBANK, "صكوك التجارة" -> USD_BCD, "صكوك التجاري" -> USD_NCB, "صكوك الأمان" -> USD_AB, "صكوك الوحدة" -> USD_WB
        - "حوالات دبي" -> USD_AE, "حوالات تركيا" -> USD_TR, "حوالات الصين" -> USD_CN

      OUTPUT FORMAT:
      Return ONLY a valid JSON object. Use null for missing values.
      {
        "USD": number, "EUR": number, "GBP": number, "TND": number, "EGP": number, "TRY": number,
        "JOD": number, "BHD": number, "KWD": number, "AED": number, "SAR": number, "QAR": number,
        "CNY": number, "GOLD": number, "USD_JBANK": number, "USD_BCD": number, "USD_NCB": number,
        "USD_AB": number, "USD_WB": number, "USD_AE": number, "USD_TR": number, "USD_CN": number,
        "OFFICIAL_USD": number, "OFFICIAL_EUR": number, "OFFICIAL_GBP": number, "OFFICIAL_TND": number,
        "OFFICIAL_SAR": number, "OFFICIAL_AED": number, "OFFICIAL_TRY": number, "OFFICIAL_CNY": number
      }`,
      config: {
        responseMimeType: "application/json",
      }
    });
    
    const result = JSON.parse(response.text);
    // Filter out nulls
    const cleanResult: Record<string, number> = {};
    for (const key in result) {
      if (result[key] !== null && typeof result[key] === 'number') {
        cleanResult[key] = result[key];
      }
    }
    return Object.keys(cleanResult).length > 0 ? cleanResult : null;
  } catch (error) {
    console.error("AI Extraction Error:", error);
    return null;
  }
}

// Initialize rates from Database on startup to ensure accuracy
async function initializeRatesFromDB() {
  if (!supabase || !supabaseAnonKey || supabaseAnonKey.includes('dummy')) return;
  
  try {
    const { data, error } = await supabase
      .from('exchange_rates')
      .select('*')
      .order('recorded_at', { ascending: false })
      .limit(100); // Fetch enough to find valid distinct prices
      
    if (error) {
      console.error("Error initializing rates from DB:", error.message);
      return;
    }
    
    if (data && data.length > 0) {
      // 1. Find the latest VALID parallel row (USD > 5.5 to filter out accidental official rates)
      const latestValidParallel = data.find(row => row.usd_parallel > 5.5) || data[0];
      
      if (latestValidParallel.rates_parallel && latestValidParallel.rates_parallel.USD > 5.5) {
        rates.parallel = { ...rates.parallel, ...latestValidParallel.rates_parallel };
      }
      
      // Load lastChanged from the latest row if it exists
      if (latestValidParallel.last_changed) {
        // Merge instead of overwrite to keep defaults for new currencies
        const dbLastChanged = latestValidParallel.last_changed;
        rates.lastChanged = {
          official: { ...rates.lastChanged.official, ...(dbLastChanged.official || {}) },
          parallel: { ...rates.lastChanged.parallel, ...(dbLastChanged.parallel || {}) }
        };
      } else {
        // Fallback: Initialize if not in DB, but use a slightly older time to distinguish from "just changed"
        const fallbackTime = new Date(Date.now() - 3600000).toISOString(); // 1 hour ago
        Object.keys(rates.official).forEach(key => {
          if (!rates.lastChanged.official[key]) rates.lastChanged.official[key] = fallbackTime;
        });
        Object.keys(rates.parallel).forEach(key => {
          if (!rates.lastChanged.parallel[key]) rates.lastChanged.parallel[key] = fallbackTime;
        });
      }
      
      // 2. Load official rates from the absolute latest row
      if (data[0].rates_official) {
        rates.official = { ...rates.official, ...data[0].rates_official };
      }
      
      // 3. Find the true previous PARALLEL rate (different from current, and valid > 5.5)
      const previousParallelRow = data.find(row => 
        row.usd_parallel !== rates.parallel.USD && 
        row.usd_parallel > 5.5 &&
        Math.abs(row.usd_parallel - rates.parallel.USD) < 1.5 // Ensure it's a realistic previous price, not a polluted jump
      );
      
      if (previousParallelRow && previousParallelRow.rates_parallel) {
        rates.previousParallel = { ...rates.previousParallel, ...previousParallelRow.rates_parallel };
      } else {
        rates.previousParallel = { ...rates.parallel };
      }

      // 4. Find the true previous OFFICIAL rate (different from current)
      const previousOfficialRow = data.find(row => 
        row.usd_official !== rates.official.USD &&
        row.usd_official > 0
      );
      
      if (previousOfficialRow && previousOfficialRow.rates_official) {
        rates.previousOfficial = { ...rates.previousOfficial, ...previousOfficialRow.rates_official };
      } else {
        rates.previousOfficial = { ...rates.official };
      }
      
      console.log("Successfully initialized and validated rates from database.");
    }
  } catch (err) {
    console.error("Error initializing rates from DB:", err);
  }
}

async function saveToSupabase() {
  if (!supabase || !supabaseAnonKey || supabaseAnonKey.includes('dummy')) return; 
  
  // Prevent saving corrupted data (Parallel USD should never be < 5.5)
  if (rates.parallel.USD < 5.5) {
    console.warn("Attempted to save invalid parallel rate. Aborting save.");
    return;
  }
  
  try {
    // Save all currencies as JSONB to ensure we capture everything accurately
    // without breaking the database schema.
    const record = { 
      usd_parallel: rates.parallel.USD, 
      usd_official: rates.official.USD,
      rates_parallel: rates.parallel,
      rates_official: rates.official,
      previous_parallel: rates.previousParallel,
      previous_official: rates.previousOfficial,
      last_changed: rates.lastChanged,
      recorded_at: rates.lastUpdated // استخدام وقت كتابة الرسالة في تيليجرام لضمان الشفافية
    };

    const { error } = await supabase
      .from('exchange_rates')
      .insert([record]);
      
    if (error) {
      if (!error.message.includes('schema cache')) {
        console.error("Error saving to Supabase:", error.message);
        
        // Fallback: If columns don't exist, try saving without them
        if (error.message.includes('column "previous_parallel" does not exist') || error.message.includes('column "previous_official" does not exist')) {
           await supabase.from('exchange_rates').insert([{
              usd_parallel: rates.parallel.USD, 
              usd_official: rates.official.USD,
              rates_parallel: rates.parallel,
              rates_official: rates.official,
              last_changed: rates.lastChanged,
              recorded_at: rates.lastUpdated
           }]);
        } else if (error.message.includes('column "last_changed" does not exist')) {
           await supabase.from('exchange_rates').insert([{
              usd_parallel: rates.parallel.USD, 
              usd_official: rates.official.USD,
              rates_parallel: rates.parallel,
              rates_official: rates.official,
              recorded_at: new Date().toISOString()
           }]);
        } else if (error.message.includes('column') && error.message.includes('does not exist')) {
           await supabase.from('exchange_rates').insert([{
              usd_parallel: rates.parallel.USD, 
              usd_official: rates.official.USD,
              recorded_at: new Date().toISOString()
           }]);
        }
      }
    } else {
      // Cleanup old records (older than 30 days) to prevent database bloat
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      await supabase
        .from('exchange_rates')
        .delete()
        .lt('recorded_at', thirtyDaysAgo.toISOString());
    }
  } catch (err) {
    console.error("Supabase save error:", err);
  }
}

async function fetchHistoryFromSupabase() {
  if (!supabase || !supabaseAnonKey || supabaseAnonKey.includes('dummy')) return history;
  
  try {
    const { data, error } = await supabase
      .from('exchange_rates')
      .select('*')
      .order('recorded_at', { ascending: false })
      .limit(10000);
      
    if (error) {
      if (!error.message.includes('schema cache')) {
        console.error("Supabase fetch error:", error.message);
      }
      return history; // fallback
    }
    
    if (data && data.length > 0) {
      return data.reverse()
        .map(row => ({
          time: row.recorded_at,
          usdParallel: row.usd_parallel || (row.rates_parallel ? row.rates_parallel.USD : 0),
          usdOfficial: row.usd_official || (row.rates_official ? row.rates_official.USD : 0),
          ratesParallel: row.rates_parallel || { USD: row.usd_parallel },
          ratesOfficial: row.rates_official || { USD: row.usd_official },
          previousParallel: row.previous_parallel,
          previousOfficial: row.previous_official
        }))
        .filter(item => item.usdParallel > 5.5 || item.usdOfficial > 0);
    }
  } catch (err) {
    console.error("Error fetching history from Supabase:", err);
  }
  return history;
}

// Fetch real official rates from open API
async function fetchOfficialRates(): Promise<boolean> {
  const ffKey = process.env.FAST_FOREX_KEY;
  
  if (!ffKey) {
    console.warn("[Official] FastForex Key missing, skipping premium source");
    return false;
  }
  
  // Try FastForex first (Premium/Faster)
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
        console.log(`[Official] Rates updated via FastForex`);
      }
      return anyChanged;
    }
  } catch (e) {
    console.warn("[Official] FastForex failed, falling back to public APIs");
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
          EUR: lyd / data.rates.EUR,
          GBP: lyd / data.rates.GBP,
          TND: lyd / data.rates.TND,
          TRY: lyd / data.rates.TRY,
          EGP: lyd / data.rates.EGP,
          JOD: lyd / data.rates.JOD,
          AED: lyd / data.rates.AED,
          SAR: lyd / data.rates.SAR,
          BHD: lyd / data.rates.BHD,
          KWD: lyd / data.rates.KWD,
          QAR: lyd / data.rates.QAR,
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
          console.log(`Official rates updated due to changes from ${source}`);
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
    { id: "USD", name: "دولار أمريكي", regex: "(?:الدولار|دولار|الخضراء|خضراء|كاش|usd|🇺🇸)\\s*(?:كاش)?\\s*[=:]?\\s*(\\d{1,2}(?:[\\.,]\\d{1,4})?)", min: 5.0, max: 25.0, isInverse: false, flag: "us" },
    { id: "EUR", name: "يورو", regex: "(?:يورو|اليورو|eur|🇪🇺)\\s*[=:]?\\s*(\\d{1,2}(?:[\\.,]\\d{1,4})?)", min: 5.0, max: 25.0, isInverse: false, flag: "eu" },
    { id: "GBP", name: "جنيه إسترليني", regex: "(?:باوند|استرليني|gbp|🇬🇧)\\s*[=:]?\\s*(\\d{1,2}(?:[\\.,]\\d{1,4})?)", min: 5.0, max: 25.0, isInverse: false, flag: "gb" },
    { id: "TND", name: "دينار تونسي", regex: "(?:تونسي|تونس|tnd|🇹🇳)\\s*[=:]?\\s*(\\d{1,2}(?:[\\.,]\\d{1,4})?)", min: 0.1, max: 10.0, isInverse: false, flag: "tn" },
    { id: "EGP", name: "جنيه مصري", regex: "(?:مصري|مصر|egp|🇪🇬)\\s*[=:]?\\s*(\\d{0,1}(?:[\\.,]\\d{1,4})?)", min: 0.01, max: 5.0, isInverse: false, flag: "eg" },
    { id: "TRY", name: "ليرة تركية", regex: "(?:ليرة|تركي|try|🇹🇷)\\s*[=:]?\\s*(\\d{0,1}(?:[\\.,]\\d{1,4})?)", min: 0.01, max: 5.0, isInverse: false, flag: "tr" },
    { id: "JOD", name: "دينار أردني", regex: "(?:jod|JOD|أردني|🇯🇴)\\s*[=:]?\\s*(\\d{1,2}(?:[\\.,]\\d{1,4})?)", min: 5.0, max: 30.0, isInverse: false, flag: "jo" },
    { id: "BHD", name: "دينار بحريني", regex: "(?:bhd|BHD|بحريني|🇧🇭)\\s*[=:]?\\s*(\\d{1,2}(?:[\\.,]\\d{1,4})?)", min: 10.0, max: 50.0, isInverse: false, flag: "bh" },
    { id: "KWD", name: "دينار كويتي", regex: "(?:kwd|KWD|كويتي|🇰🇼)\\s*[=:]?\\s*(\\d{1,2}(?:[\\.,]\\d{1,4})?)", min: 10.0, max: 60.0, isInverse: false, flag: "kw" },
    { id: "AED", name: "درهم إماراتي", regex: "(?:aed|AED|إماراتي|امارات|🇦🇪)\\s*[=:]?\\s*(\\d{1,2}(?:[\\.,]\\d{1,4})?)", min: 0.5, max: 10.0, isInverse: false, flag: "ae" },
    { id: "SAR", name: "ريال سعودي", regex: "(?:sar|SAR|سعودي|ريال|🇸🇦)\\s*[=:]?\\s*(\\d{1,2}(?:[\\.,]\\d{1,4})?)", min: 0.5, max: 10.0, isInverse: false, flag: "sa" },
    { id: "QAR", name: "ريال قطري", regex: "(?:qar|QAR|قطري|🇶🇦)\\s*[=:]?\\s*(\\d{1,2}(?:[\\.,]\\d{1,4})?)", min: 0.5, max: 10.0, isInverse: false, flag: "qa" },
    { id: "USD_JBANK", name: "صكوك الجمهورية", regex: "(?:jbank|الجمهورية)\\s*[=:]?\\s*(\\d{1,2}(?:[\\.,]\\d{1,4})?)", min: 5.0, max: 25.0, isInverse: false, flag: "us" },
    { id: "USD_BCD", name: "صكوك التجارة", regex: "(?:bcd|التجارة والتنمية)\\s*[=:]?\\s*(\\d{1,2}(?:[\\.,]\\d{1,4})?)", min: 5.0, max: 25.0, isInverse: false, flag: "us" },
    { id: "USD_NCB", name: "صكوك التجاري", regex: "(?:NCB|التجاري الوطني)\\s*[=:]?\\s*(\\d{1,2}(?:[\\.,]\\d{1,4})?)", min: 5.0, max: 25.0, isInverse: false, flag: "us" },
    { id: "USD_AB", name: "صكوك الأمان", regex: "(?:AB|الأمان|الامان)\\s*[=:]?\\s*(\\d{1,2}(?:[\\.,]\\d{1,4})?)", min: 5.0, max: 25.0, isInverse: false, flag: "us" },
    { id: "USD_WB", name: "صكوك الوحدة", regex: "(?:WB|الوحدة)\\s*[=:]?\\s*(\\d{1,2}(?:[\\.,]\\d{1,4})?)", min: 5.0, max: 25.0, isInverse: false, flag: "us" },
    { id: "USD_AE", name: "حوالات دبي", regex: "(?:دبي|امارات|الإمارات|🇦🇪)\\s*[=:]?\\s*(\\d{1,2}(?:[\\.,]\\d{1,4})?)", min: 5.0, max: 25.0, isInverse: false, flag: "ae" },
    { id: "USD_TR", name: "حوالات تركيا", regex: "(?:تركيا|تركي|🇹🇷)\\s*[=:]?\\s*(\\d{1,2}(?:[\\.,]\\d{1,4})?)", min: 5.0, max: 25.0, isInverse: false, flag: "tr" },
    { id: "USD_CN", name: "حوالات الصين", regex: "(?:الصين|صينية|🇨🇳)\\s*[=:]?\\s*(\\d{1,2}(?:[\\.,]\\d{1,4})?)", min: 5.0, max: 25.0, isInverse: false, flag: "cn" },
    { id: "CNY", name: "يوان صيني", regex: "(?:cny|CNY|يوان|🇨🇳)\\s*[=:]?\\s*(\\d{1,2}(?:[\\.,]\\d{1,4})?)", min: 0.5, max: 5.0, isInverse: false, flag: "cn" },
    { id: "GOLD", name: "كسر الذهب", regex: "(?:كسر الذهب|ذهبي|ذهب)\\s*[=:]?\\s*(\\d{2,4}(?:[\\.,]\\d+)?)", min: 100, max: 5000, isInverse: false, flag: "ly" },
    { id: "OFFICIAL_USD", name: "الدولار الرسمي", regex: "(?:الرسمي|المركزي)\\s*[=:]?\\s*(\\d{1,2}(?:[\\.,]\\d{1,4})?)", min: 4.0, max: 6.0, isInverse: false, flag: "us" }
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
          // Keep DB values for price/regex/flag/name, but ensure flag/name are present from defaults if missing
          const isValidFlag = dbTerm.flag && dbTerm.flag !== "undefined" && dbTerm.flag !== "null" && dbTerm.flag.trim() !== "";
          const isValidName = dbTerm.name && dbTerm.name !== "undefined" && dbTerm.name !== "null" && dbTerm.name.trim() !== "";
          return {
            ...defaultTerm, // Start with defaults
            ...dbTerm,      // Override with DB values
            flag: isValidFlag ? dbTerm.flag : defaultTerm.flag, // Use DB flag if valid, otherwise default
            name: isValidName ? dbTerm.name : defaultTerm.name  // Use DB name if valid, otherwise default
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
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        const response = await fetch(`https://t.me/s/${channel}`, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (!response.ok) return null;
        const html = await response.text();
        return { channel, html };
      } catch (e) {
        console.error(`Failed to fetch ${channel}:`, e);
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
              if (match && match[1]) {
                let val = parseFloat(match[1].replace(',', '.'));
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

    if (latestRates.USD) {
      console.log(`[Scraper] Scrape check completed. USD found: ${latestRates.USD}`);
      
      let anyChanged = false;

      // Update official rates if found in Telegram (often faster than APIs)
      // Update official rates if found in Telegram (often faster than APIs)
      const officialKeys = {
        OFFICIAL_USD: 'USD',
        OFFICIAL_EUR: 'EUR',
        OFFICIAL_GBP: 'GBP',
        OFFICIAL_TND: 'TND',
        OFFICIAL_SAR: 'SAR',
        OFFICIAL_AED: 'AED',
        OFFICIAL_TRY: 'TRY',
        OFFICIAL_CNY: 'CNY'
      };

      for (const [aiKey, rateKey] of Object.entries(officialKeys)) {
        if (latestRates[aiKey]) {
          if (isSignificantChange(rates.official[rateKey], latestRates[aiKey])) {
            console.log(`[Scraper] Updating official ${rateKey} from Telegram: ${latestRates[aiKey]}`);
            rates.previousOfficial[rateKey] = rates.official[rateKey];
            rates.official[rateKey] = latestRates[aiKey];
            rates.lastChanged.official[rateKey] = new Date().toISOString();
            anyChanged = true;
          }
        }
      }

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
            term.id === "USD_CHECKS" ? latestRates.USD + 0.8 :
            term.id === "EUR" ? latestRates.USD * 1.08 :
            term.id === "GBP" ? latestRates.USD * 1.26 :
            term.id === "GOLD" ? 1280 :
            (term.id === "USD_TR" || term.id === "USD_AE") ? latestRates.USD :
            term.id === "TND" ? latestRates.USD * 0.32 :
            term.id === "TRY" ? latestRates.USD * 0.03 :
            term.id === "EGP" ? latestRates.USD * 0.02 :
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
        "img-src": ["'self'", "data:", "https://hatscripts.github.io", "https://picsum.photos", "https://*.supabase.co", "https://*.google.com", "https://*.gstatic.com"],
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
      fetchParallelRatesFromTelegram();
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
      
      res.json({ 
        success: true, 
        message: "تم تشغيل عملية التحديث بنجاح",
        details: {
          official: officialUpdate ? "تم التحديث" : "لا يوجد تغيير",
          parallel: parallelTally
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
    
    console.error("\n[CLIENT ERROR LOG]");
    console.error(`Time: ${new Date().toISOString()}`);
    console.error(`Message: ${message}`);
    console.error(`Context: ${context}`);
    console.error(`URL: ${url}`);
    console.error(`User Agent: ${userAgent}`);
    if (stack) console.error(`Stack: ${stack}`);
    console.error("-------------------\n");

    // Optional: Save to Supabase if configured
    if (supabase && supabaseAnonKey && !supabaseAnonKey.includes('dummy')) {
      supabase.from('error_logs').insert([{
        message,
        stack,
        context,
        url,
        user_agent: userAgent,
        created_at: new Date().toISOString()
      }]).then(({ error }) => {
        if (error && error.code !== '42P01') { // Ignore "relation does not exist" error if table isn't created yet
          console.error("Failed to save error log to Supabase:", error);
        }
      });
    }

    res.status(200).json({ success: true });
  });

  app.get("/api/rates", async (req: express.Request, res: express.Response) => {
    try {
      if (req.query.refresh === 'true') {
        await initializeRatesFromDB();
      }
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
      const oldOfficial = rates.official.USD;

      const results = await Promise.all([
        fetchOfficialRates(),
        fetchParallelRatesFromTelegram()
      ]);
      
      const anyChangesDetected = results.some(r => r === true);

      if (anyChangesDetected) {
        console.log("[Cron-Job] Changes detected! Saving to database...");
        await saveToSupabase();
      } else {
        console.log("[Cron-Job] Checked all sources. No price changes found.");
      }
      
      const duration = Date.now() - startTime;
      const newUsd = rates.parallel.USD;
      const newOfficial = rates.official.USD;
      
      res.status(200).json({ 
        success: true, 
        message: "Data refreshed successfully",
        details: {
          duration_ms: duration,
          parallel_usd: { current: newUsd, changed: newUsd !== oldUsd },
          official_usd: { current: newOfficial, changed: newOfficial !== oldOfficial },
          last_scrape_time: new Date().toISOString()
        }
      });
    } catch (err) {
      console.error("[Cron-Job] Refresh failed:", err);
      res.status(500).json({ success: false, error: "Failed to refresh data" });
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
