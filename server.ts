import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client for server
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://rbqvldyagskdxjhnkqvt.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || ''; 
const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
  if (!supabaseAnonKey || supabaseAnonKey.includes('dummy')) return;
  
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
  if (!supabaseAnonKey || supabaseAnonKey.includes('dummy')) return; 
  
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
  if (!supabaseAnonKey || supabaseAnonKey.includes('dummy')) return history;
  
  try {
    const { data, error } = await supabase
      .from('exchange_rates')
      .select('*')
      .order('recorded_at', { ascending: false })
      .limit(150);
      
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
          usdOfficial: row.usd_official || (row.rates_official ? row.rates_official.USD : 0)
        }))
        .filter(item => item.usdParallel > 5.5); // Filter out bad/zero data that skews the chart
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

// Telegram channels for parallel market rates
const TELEGRAM_CHANNELS = ["dollarr_ly", "musheermarket", "lydollar", "djheih2026", "suqalmushir"];

async function fetchParallelRatesFromTelegram() {
  try {
    // Store values with their timestamps to ensure we pick the absolute latest across all channels
    const priceHistory: Record<string, { value: number, time: number }[]> = {
      USD: [], USD_CHECKS: [], EUR: [], GBP: [], GOLD: [], USD_TR: [], USD_AE: []
    };

    for (const channel of TELEGRAM_CHANNELS) {
      try {
        const response = await fetch(`https://t.me/s/${channel}`);
        if (!response.ok) continue;
        
        const html = await response.text();
        // Split HTML into individual message blocks
        const messageBlocks = html.split('tgme_widget_message_wrap');
        
        for (const block of messageBlocks) {
          const textMatch = block.match(/<div class="tgme_widget_message_text[^>]*>(.*?)<\/div>/);
          const timeMatch = block.match(/<time datetime="([^"]+)"/);
          
          if (textMatch && timeMatch) {
            const cleanText = textMatch[1].replace(/<[^>]+>/g, ' ');
            const time = new Date(timeMatch[1]).getTime();
            
            const extract = (regex: RegExp, key: string, min: number, max: number) => {
              const match = cleanText.match(regex);
              if (match && match[1]) {
                const val = parseFloat(match[1]);
                if (!isNaN(val) && val > min && val < max) {
                  priceHistory[key].push({ value: val, time });
                  return true;
                }
              }
              return false;
            };

            // Use strict regexes. Max 20.0 to allow real market spikes.
            extract(/(?:الدولار كاش|دولار كاش|الدولار|دولار|usd|🇺🇸)\s*(?:=|:|-)\s*(\d{1,2}\.\d{2,3})/i, 'USD', 5.0, 20.0);
            extract(/(?:صكوك|بنوك|الدولار بنوك|صك|الجمهورية|التجارة|الوحدة|الامان)\s*(?:=|:|-)\s*(\d{1,2}\.\d{2,3})/i, 'USD_CHECKS', 5.0, 20.0);
            extract(/(?:يورو|اليورو|eur|🇪🇺)\s*(?:=|:|-)\s*(\d{1,2}\.\d{2,3})/i, 'EUR', 5.0, 20.0);
            extract(/(?:باوند|الباوند|gbp|🇬🇧)\s*(?:=|:|-)\s*(\d{1,2}\.\d{2,3})/i, 'GBP', 5.0, 20.0);
            extract(/(?:كسر الذهب عيار 18|كسر الذهب|ذهب)\s*(?:=|:|-)\s*(\d{3,4}(?:\.\d+)?)/i, 'GOLD', 100, 5000);
            extract(/(?:دولار حوالات تركيا|حوالات تركيا)\s*(?:=|:|-)\s*(\d{1,2}\.\d{2,3})/i, 'USD_TR', 5.0, 20.0);
            extract(/(?:دولار حوالات دبي|حوالات دبي)\s*(?:=|:|-)\s*(\d{1,2}\.\d{2,3})/i, 'USD_AE', 5.0, 20.0);
          }
        }
      } catch (err) {
        console.error(`Error fetching from ${channel}:`, err);
      }
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
      
      rates.parallel.USD = latestRates.USD;
      rates.parallel.USD_CHECKS = latestRates.USD_CHECKS || rates.parallel.USD_CHECKS || (latestRates.USD + 0.8);
      rates.parallel.EUR = latestRates.EUR || rates.parallel.EUR || (latestRates.USD * 1.08);
      rates.parallel.GBP = latestRates.GBP || rates.parallel.GBP || (latestRates.USD * 1.26);
      rates.parallel.GOLD = latestRates.GOLD || rates.parallel.GOLD || 1280;
      rates.parallel.USD_TR = latestRates.USD_TR || rates.parallel.USD_TR || latestRates.USD;
      rates.parallel.USD_AE = latestRates.USD_AE || rates.parallel.USD_AE || latestRates.USD;
      
      rates.parallel.TND = latestRates.USD * 0.32;
      rates.parallel.TRY = latestRates.USD * 0.03;
      rates.parallel.EGP = latestRates.USD * 0.02;

      // Override previous with actual Telegram history if available and realistic
      if (previousRates.USD && Math.abs(previousRates.USD - latestRates.USD) < 1.5) {
        rates.previousParallel.USD = previousRates.USD;
      } else if (Math.abs(rates.previousParallel.USD - rates.parallel.USD) > 1.5) {
        // If DB previous is too far (polluted jump from 7.30 to 10.79), reset it to current so change is 0
        rates.previousParallel.USD = rates.parallel.USD;
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
      });
      if (history.length > 150) history.shift();
    }
  } catch (error) {
    console.error("Error fetching from Telegram:", error);
  }
}

// Initial fetch and setup
initializeRatesFromDB().then(() => {
  fetchOfficialRates();
  fetchParallelRatesFromTelegram();
});

// Update official rates every hour
setInterval(fetchOfficialRates, 60 * 60 * 1000);

// Update parallel rates from Telegram every 5 minutes
setInterval(fetchParallelRatesFromTelegram, 5 * 60 * 1000);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/rates", (req, res) => {
    res.json(rates);
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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
