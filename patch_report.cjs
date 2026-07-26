const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

const reportCode = `
  app.get("/api/admin/system-report", requireAdmin, async (req, res) => {
    try {
      const minutesSinceLastScrape = Math.floor((Date.now() - lastSuccessfulScrape.getTime()) / 60000);
      
      let recentErrors = [];
      let dbStats = null;
      if (supabase && process.env.VITE_SUPABASE_ANON_KEY && !process.env.VITE_SUPABASE_ANON_KEY.includes('dummy')) {
        try {
          const { data: logs } = await supabase.from('error_logs').select('*').order('created_at', { ascending: false }).limit(20);
          if (logs) recentErrors = logs;
          
          const [parallel, official] = await Promise.all([
            supabase.from('parallel_rates').select('*', { count: 'exact', head: true }),
            supabase.from('official_rates').select('*', { count: 'exact', head: true })
          ]);
          dbStats = {
            parallel_rates: parallel.count || 0,
            official_rates: official.count || 0
          };
        } catch (e) {}
      }

      const memory = process.memoryUsage();
      const report = {
        generated_at: new Date().toISOString(),
        system_health: {
          uptime_hours: (process.uptime() / 3600).toFixed(2),
          server_start_time: serverStartTime.toISOString(),
          memory_mb: {
            rss: Math.round(memory.rss / 1024 / 1024),
            heap_total: Math.round(memory.heapTotal / 1024 / 1024),
            heap_used: Math.round(memory.heapUsed / 1024 / 1024)
          },
          node_version: process.version
        },
        database_status: {
          supabase_connected: !!(supabase && process.env.VITE_SUPABASE_ANON_KEY && !process.env.VITE_SUPABASE_ANON_KEY.includes('dummy')),
          stats: dbStats
        },
        scraper_status: {
          last_successful_scrape: lastSuccessfulScrape.toISOString(),
          minutes_since_last_scrape: minutesSinceLastScrape,
          is_stale: minutesSinceLastScrape > 30,
          channels_count: appConfig.channels.length,
          terms_count: appConfig.terms.length
        },
        telegram_status: {
          is_authenticated: !!activeClient
        },
        network_stats: {
          public_api_requests: apiStats.public.totalRequests,
          premium_api_requests: apiStats.premium.totalRequests,
          banned_ips_count: apiStats.bannedIPsCount,
          active_websocket_connections: io.engine ? io.engine.clientsCount : 0
        },
        recent_critical_errors: recentErrors
      };

      res.json(report);
    } catch (err) {
      res.status(500).json({ error: "Failed to generate system report", message: String(err) });
    }
  });
`;

content = content.replace(
  'app.get("/api/admin/error-logs", requireAdmin, async (req: express.Request, res: express.Response) => {',
  reportCode + '\n  app.get("/api/admin/error-logs", requireAdmin, async (req: express.Request, res: express.Response) => {'
);

fs.writeFileSync('server.ts', content);
