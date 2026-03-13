import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import { createClient } from '@supabase/supabase-js';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';

// Initialize Supabase client for server
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://rbqvldyagskdxjhnkqvt.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || ''; 

// Only create client if key is provided to avoid crashing on startup
const supabase = supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Initial data for the Libyan Dinar exchange rates
let rates = {
  official: {
    USD: 4.85,
    EUR: 5.25,
    GBP: 6.15,
    TND: 1.55,
    TRY: 0.15,
    EGP: 0.10,
  },
  parallel: {
    USD: 7.30,
    USD_CHECKS: 8.00,
    EUR: 7.85,
    GBP: 9.20,
    GOLD: 1280,
    USD_TR: 7.30,
    USD_AE: 7.30,
    TND: 2.35,
    TRY: 0.22,
    EGP: 0.14,
  },
  previousOfficial: {
    USD: 4.85,
    EUR: 5.25,
    GBP: 6.15,
    TND: 1.55,
    TRY: 0.15,
    EGP: 0.10,
  },
  previousParallel: {
    USD: 7.30,
    USD_CHECKS: 8.00,
    EUR: 7.85,
    GBP: 9.20,
    GOLD: 1280,
    USD_TR: 7.30,
    USD_AE: 7.30,
    TND: 2.35,
    TRY: 0.22,
    EGP: 0.14,
  },
  lastUpdated: new Date().toISOString(),
};

// History for the chart (fallback if Supabase fails)
let history: any[] = [];
const now = new Date();
for (let i = 24; i >= 0; i--) {
  const time = new Date(now.getTime() - i * 60 * 60 * 1000);
  history.push({
    time: time.toISOString(),
    usdParallel: 7.30,
    usdOfficial: 4.85,
  });
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
        rates.parallel = latestValidParallel.rates_parallel;
      }
      
      // 2. Load official rates from the absolute latest row
      if (data[0].rates_official) {
        rates.official = data[0].rates_official;
      }
      
      // 3. Find the true previous PARALLEL rate (different from current, and valid > 5.5)
      const previousParallelRow = data.find(row => 
        row.usd_parallel !== rates.parallel.USD && 
        row.usd_parallel > 5.5 &&
        Math.abs(row.usd_parallel - rates.parallel.USD) < 1.5 // Ensure it's a realistic previous price, not a polluted jump
      );
      
      if (previousParallelRow && previousParallelRow.rates_parallel) {
        rates.previousParallel = previousParallelRow.rates_parallel;
      } else {
        rates.previousParallel = { ...rates.parallel };
      }

      // 4. Find the true previous OFFICIAL rate (different from current)
      const previousOfficialRow = data.find(row => 
        row.usd_official !== rates.official.USD &&
        row.usd_official > 0
      );
      
      if (previousOfficialRow && previousOfficialRow.rates_official) {
        rates.previousOfficial = previousOfficialRow.rates_official;
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
      recorded_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from('exchange_rates')
      .insert([record]);
      
    if (error) {
      if (!error.message.includes('schema cache')) {
        console.error("Error saving to Supabase:", error.message);
        
        // Fallback: If JSONB columns don't exist, try saving just the flat USD rates
        if (error.message.includes('column') && error.message.includes('does not exist')) {
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
          ratesOfficial: row.rates_official || { USD: row.usd_official }
        }))
        .filter(item => item.usdParallel > 5.5 || item.usdOfficial > 0);
    }
  } catch (err) {
    console.error("Error fetching history from Supabase:", err);
  }
  return history;
}

// Fetch real official rates from open API
async function fetchOfficialRates() {
  try {
    const response = await fetch("https://open.er-api.com/v6/latest/USD");
    const data = await response.json();
    
    if (data && data.rates && data.rates.LYD) {
      const lyd = data.rates.LYD;
      
      // Only update previous rate if the new rate is actually different
      if (lyd !== rates.official.USD) {
        rates.previousOfficial = { ...rates.official };
      }
      
      rates.official = {
        USD: lyd,
        EUR: lyd / data.rates.EUR,
        GBP: lyd / data.rates.GBP,
        TND: lyd / data.rates.TND,
        TRY: lyd / data.rates.TRY,
        EGP: lyd / data.rates.EGP,
      };
      
      rates.lastUpdated = new Date().toISOString();
      console.log("Official rates updated successfully.");
      saveToSupabase();
    }
  } catch (error) {
    console.error("Error fetching official rates:", error);
  }
}

// Dynamic Configuration
let appConfig = {
  channels: ["dollarr_ly", "musheermarket", "lydollar", "djheih2026", "suqalmushir"],
  terms: [
    { id: "USD", name: "دولار أمريكي", regex: "(?:الدولار|دولار|الخضراء|خضراء|ورقة|الورقة|كاش|usd|🇺🇸)\\s*(?:كاش)?\\s*[=:]?\\s*(\\d{1,2}(?:[\\.,]\\d{1,3})?)", min: 5.0, max: 25.0, isInverse: false, flag: "us" },
    { id: "USD_CHECKS", name: "دولار أمريكي (صكوك)", regex: "(?:صكوك|صك|بصك|بنوك|شيك|شيكات|مصرف|مصارف|بنوك)\\s*[=:]?\\s*(\\d{1,2}(?:[\\.,]\\d{1,3})?)", min: 5.0, max: 25.0, isInverse: false, flag: "us" },
    { id: "EUR", name: "يورو", regex: "(?:يورو|اليورو|eur|🇪🇺)\\s*[=:]?\\s*(\\d{1,2}(?:[\\.,]\\d{1,3})?)", min: 5.0, max: 25.0, isInverse: false, flag: "eu" },
    { id: "GBP", name: "جنيه إسترليني", regex: "(?:باوند|استرليني|gbp|🇬🇧)\\s*[=:]?\\s*(\\d{1,2}(?:[\\.,]\\d{1,3})?)", min: 5.0, max: 25.0, isInverse: false, flag: "gb" },
    { id: "GOLD", name: "كسر الذهب", regex: "(?:كسر الذهب|ذهب كسر|ذهب|الذهب)\\s*(?:18)?\\s*[=:]?\\s*(\\d{2,4}(?:[\\.,]\\d+)?)", min: 100, max: 5000, isInverse: false, flag: "" },
    { id: "USD_TR", name: "حوالات تركيا", regex: "(?:تركيا|تركي|اسطنبول|🇹🇷)\\s*[=:]?\\s*(\\d{1,2}(?:[\\.,]\\d{1,3})?)", min: 5.0, max: 25.0, isInverse: false, flag: "tr" },
    { id: "USD_AE", name: "حوالات دبي", regex: "(?:دبي|امارات|الإمارات|🇦🇪)\\s*[=:]?\\s*(\\d{1,2}(?:[\\.,]\\d{1,3})?)", min: 5.0, max: 25.0, isInverse: false, flag: "ae" },
    { id: "TND", name: "دينار تونسي", regex: "(?:تونسي|تونس|tnd|🇹🇳)\\s*[=:]?\\s*([1-9](?:[\\.,]\\d+)?)", min: 0.5, max: 10.0, isInverse: false, flag: "tn" },
    { id: "EGP", name: "جنيه مصري", regex: "(?:مصري|مصر|egp|🇪🇬)\\s*[=:]?\\s*(0(?:[\\.,]\\d+))", min: 0.01, max: 5.0, isInverse: false, flag: "eg" }
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
      appConfig = data.config;
      console.log("Loaded config from Supabase successfully");
    }
  } catch (err) {
    console.error("Failed to load config from Supabase", err);
  }
}

async function saveConfigToSupabase(newConfig: any) {
  if (!supabase || !supabaseAnonKey || supabaseAnonKey.includes('dummy')) return false;
  try {
    const { error } = await supabase
      .from('app_config')
      .upsert({ id: 1, config: newConfig, updated_at: new Date().toISOString() });
      
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
    const priceHistory: Record<string, { value: number, time: number }[]> = {};
    for (const term of appConfig.terms) {
      priceHistory[term.id] = [];
    }

    let successfulChannels = 0;

    for (const channel of appConfig.channels) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

        const response = await fetch(`https://t.me/s/${channel}`, { signal: controller.signal });
        clearTimeout(timeoutId);
        
        if (!response.ok) continue;
        
        const html = await response.text();
        const messageBlocks = html.split('tgme_widget_message_wrap');
        
        if (messageBlocks.length > 1) successfulChannels++;

        for (const block of messageBlocks) {
          const textMatch = block.match(/<div class="tgme_widget_message_text[^>]*>(.*?)<\/div>/);
          const timeMatch = block.match(/<time datetime="([^"]+)"/);
          
          if (textMatch && timeMatch) {
            const cleanText = textMatch[1].replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ');
            const time = new Date(timeMatch[1]).getTime();
            
            // Skip very old messages (older than 48h) to keep data fresh
            if (Date.now() - time > 48 * 60 * 60 * 1000) continue;

            const isOfficialReport = /رسمي|المركزي|بفارق|نشرة|أسعار المصرف/i.test(cleanText);
            const isParallelReport = /موازي|سوداء|كاش|خضراء|ورقة|سوق/i.test(cleanText);
            if (isOfficialReport && !isParallelReport) continue;

            const extract = (regexStr: string, key: string, min: number, max: number, isInverse = false) => {
              try {
                const regex = new RegExp(regexStr, 'i');
                const match = cleanText.match(regex);
                if (match && match[1]) {
                  let val = parseFloat(match[1].replace(',', '.'));
                  if (isInverse && val > 0) val = 1 / val;
                  
                  if (!isNaN(val) && val > min && val < max) {
                    priceHistory[key].push({ value: val, time });
                    return true;
                  }
                }
              } catch (e) {
                console.error("Invalid regex:", regexStr);
              }
              return false;
            };

            // Dynamic Regex extraction
            for (const term of appConfig.terms) {
              extract(term.regex, term.id, term.min, term.max, term.isInverse);
            }
          }
        }
      } catch (err) {
        console.error(`Error fetching from ${channel}:`, err);
      }
    }

    if (successfulChannels > 0) {
      lastSuccessfulScrape = new Date();
    }

    const latestRates: Record<string, number> = {};
    const previousRates: Record<string, number> = {};

    for (const key in priceHistory) {
      // Sort all extracted prices for this currency by timestamp (oldest to newest)
      const historyArr = priceHistory[key].sort((a, b) => a.time - b.time);
      
      if (historyArr.length > 0) {
        latestRates[key] = historyArr[historyArr.length - 1].value; // Absolute latest price across all channels
        
        // Find the true previous price (the last price that was different from the current one)
        for (let i = historyArr.length - 2; i >= 0; i--) {
          if (historyArr[i].value !== latestRates[key]) {
            previousRates[key] = historyArr[i].value;
            break;
          }
        }
      }
    }

    if (latestRates.USD) {
      // Shift current to previous if it changed
      if (latestRates.USD !== rates.parallel.USD) {
        rates.previousParallel = { ...rates.parallel };
      }
      
      // Dynamically assign all extracted rates
      for (const term of appConfig.terms) {
        if (latestRates[term.id]) {
          rates.parallel[term.id] = latestRates[term.id];
        } else if (!rates.parallel[term.id]) {
          // Initialize with some fallback if it doesn't exist at all
          if (term.id === "USD_CHECKS") rates.parallel[term.id] = latestRates.USD + 0.8;
          else if (term.id === "EUR") rates.parallel[term.id] = latestRates.USD * 1.08;
          else if (term.id === "GBP") rates.parallel[term.id] = latestRates.USD * 1.26;
          else if (term.id === "GOLD") rates.parallel[term.id] = 1280;
          else if (term.id === "USD_TR" || term.id === "USD_AE") rates.parallel[term.id] = latestRates.USD;
          else if (term.id === "TND") rates.parallel[term.id] = latestRates.USD * 0.32;
          else if (term.id === "TRY") rates.parallel[term.id] = latestRates.USD * 0.03;
          else if (term.id === "EGP") rates.parallel[term.id] = latestRates.USD * 0.02;
          else rates.parallel[term.id] = 0; // Default for new unknown currencies
        }
      }

      // Override previous with actual Telegram history if available and realistic
      for (const term of appConfig.terms) {
        const key = term.id;
        if (previousRates[key] && latestRates[key] && Math.abs(previousRates[key] - latestRates[key]) < (latestRates[key] * 0.2)) {
          rates.previousParallel[key] = previousRates[key];
        } else if (rates.previousParallel[key] && rates.parallel[key] && Math.abs(rates.previousParallel[key] - rates.parallel[key]) > (rates.parallel[key] * 0.2)) {
          // If DB previous is too far (polluted jump), reset it to current so change is 0
          rates.previousParallel[key] = rates.parallel[key];
        }
      }

      rates.lastUpdated = new Date().toISOString();
      console.log(`Parallel rates updated. Latest:`, latestRates.USD, `Previous:`, rates.previousParallel.USD);
      
      // Save the real fetched rates to Supabase
      saveToSupabase();
      
      // Also update local history fallback
      history.push({
        time: new Date().toISOString(),
        usdParallel: rates.parallel.USD,
        usdOfficial: rates.official.USD,
        ratesParallel: { ...rates.parallel },
        ratesOfficial: { ...rates.official }
      });
      if (history.length > 5000) history.shift();
    }
  } catch (error) {
    console.error("Error fetching from Telegram:", error);
  }
}

// Initial fetch and setup
initializeRatesFromDB().then(() => {
  loadConfigFromSupabase().then(() => {
    fetchOfficialRates();
    fetchParallelRatesFromTelegram();
  });
});

// Update official rates every hour
setInterval(fetchOfficialRates, 60 * 60 * 1000);

// Update parallel rates from Telegram every 5 minutes
setInterval(fetchParallelRatesFromTelegram, 5 * 60 * 1000);

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

  wss.on('connection', (ws) => {
    onlineUsers++;
    broadcastOnlineCount();

    ws.on('close', () => {
      onlineUsers = Math.max(0, onlineUsers - 1);
      broadcastOnlineCount();
    });
  });

  function broadcastOnlineCount() {
    const data = JSON.stringify({ type: 'online_count', count: onlineUsers });
    wss.clients.forEach((client) => {
      if (client.readyState === 1) {
        client.send(data);
      }
    });
  }

  app.use(express.json());

  // --- Admin API ---
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";
  let adminToken = Math.random().toString(36).substring(2); // Simple in-memory token

  app.post("/api/admin/login", (req, res) => {
    const { password } = req.body;
    if (password === ADMIN_PASSWORD) {
      res.json({ success: true, token: adminToken });
    } else {
      res.status(401).json({ success: false, message: "كلمة المرور غير صحيحة" });
    }
  });

  const requireAdmin = (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    if (authHeader === `Bearer ${adminToken}`) {
      next();
    } else {
      res.status(401).json({ success: false, message: "غير مصرح" });
    }
  };

  app.get("/api/admin/config", requireAdmin, (req, res) => {
    res.json(appConfig);
  });

  app.post("/api/admin/config", requireAdmin, async (req, res) => {
    try {
      const newConfig = req.body;
      if (!newConfig.channels || !newConfig.terms) {
        return res.status(400).json({ success: false, message: "بيانات غير صالحة" });
      }
      appConfig = newConfig;
      
      // Save to Supabase
      await saveConfigToSupabase(appConfig);
      
      // Trigger a refresh with new config
      fetchParallelRatesFromTelegram();
      
      res.json({ success: true, message: "تم حفظ الإعدادات بنجاح" });
    } catch (err) {
      console.error("Error saving config:", err);
      res.status(500).json({ success: false, message: "حدث خطأ أثناء الحفظ" });
    }
  });
  // --- End Admin API ---

  // API Routes
  app.get("/api/online-count", (req, res) => {
    res.json({ count: onlineUsers });
  });

  app.get("/api/status", (req, res) => {
    const minutesSinceLastScrape = Math.floor((Date.now() - lastSuccessfulScrape.getTime()) / 60000);
    res.json({ 
      status: minutesSinceLastScrape > 30 ? "stale" : "ok",
      lastScrape: lastSuccessfulScrape,
      minutesSinceLastScrape
    });
  });

  app.get("/api/config", (req, res) => {
    res.json({ terms: appConfig.terms });
  });

  app.post("/api/logs/error", (req, res) => {
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

  app.get("/api/rates", (req, res) => {
    res.json(rates);
  });

  app.get("/api/refresh", async (req, res) => {
    console.log("Manual refresh triggered...");
    try {
      await Promise.all([
        fetchOfficialRates(),
        fetchParallelRatesFromTelegram()
      ]);
      res.json({ success: true, rates });
    } catch (err) {
      console.error("Manual refresh failed:", err);
      res.status(500).json({ success: false, error: "Failed to refresh data" });
    }
  });

  app.get("/api/history", async (req, res) => {
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
