const fs = require('fs');

let serverFile = fs.readFileSync('server.ts', 'utf8');

// 1. Add Interface
serverFile = serverFile.replace(
  `let lastAttemptTime = 0;`,
  `let lastAttemptTime = 0;\n\ninterface ChannelStatusInfo {\n  last_scrape_attempt: number;\n  last_post_time: number;\n  status: 'active' | 'stale' | 'error';\n  messages_processed: number;\n}\nlet channelStatusTracker: Record<string, ChannelStatusInfo> = {};`
);

// 2. Initialize in scraper
serverFile = serverFile.replace(
  `console.log(\`[Scraper] Validated channels: \${channels.join(', ')}\`);`,
  `console.log(\`[Scraper] Validated channels: \${channels.join(', ')}\`);\n    \n    const nowTimestamp = Date.now();\n    channels.forEach(ch => {\n      if (!channelStatusTracker[ch]) {\n        channelStatusTracker[ch] = { last_scrape_attempt: 0, last_post_time: 0, status: 'stale', messages_processed: 0 };\n      }\n      channelStatusTracker[ch].last_scrape_attempt = nowTimestamp;\n      channelStatusTracker[ch].status = 'stale'; // reset until success\n    });`
);

// 3. Update in GramJS success
serverFile = serverFile.replace(
  `            totalMessagesProcessed += messages.length;`,
  `            totalMessagesProcessed += messages.length;\n            channelStatusTracker[channel].status = 'active';\n            channelStatusTracker[channel].messages_processed += messages.length;\n            const latestMsgDate = Math.max(...messages.map((m: any) => m.date));\n            if (latestMsgDate > channelStatusTracker[channel].last_post_time) channelStatusTracker[channel].last_post_time = latestMsgDate;`
);

// 3.5 Update in GramJS failure
serverFile = serverFile.replace(
  `        } catch (err) {\n          throw { channel, error: err };\n        }\n      }));`,
  `        } catch (err) {\n          throw { channel, error: err };\n        }\n      }));\n      // Log GramJS errors to tracker\n      for (const result of gramJsResults) {\n        if (result.status === 'rejected') {\n          if (channelStatusTracker[result.reason.channel]) channelStatusTracker[result.reason.channel].status = 'error';\n        }\n      }`
);

// 4. Update in HTTP scraper success
serverFile = serverFile.replace(
  `          totalMessagesProcessed += (recentBlocks.length - 1);`,
  `          totalMessagesProcessed += (recentBlocks.length - 1);\n          channelStatusTracker[channel].status = 'active';\n          channelStatusTracker[channel].messages_processed += (recentBlocks.length - 1);`
);

// 5. Update HTTP scraper post time
serverFile = serverFile.replace(
  `              const time = new Date(timeMatch[1]).getTime();`,
  `              const time = new Date(timeMatch[1]).getTime();\n              if (time > channelStatusTracker[channel].last_post_time) channelStatusTracker[channel].last_post_time = time;`
);

// 6. Update HTTP scraper failure
serverFile = serverFile.replace(
  `          await logErrorArabic(\`فشل الاتصال بقناة تيليجرام: \${channel}\`, "الكاشط", errorMsg);\n          return null;`,
  `          await logErrorArabic(\`فشل الاتصال بقناة تيليجرام: \${channel}\`, "الكاشط", errorMsg);\n          return { channel, error: true };`
);

serverFile = serverFile.replace(
  `        if (result.status === 'fulfilled' && result.value) {\n          const { channel, blocks } = result.value;`,
  `        if (result.status === 'fulfilled' && result.value) {\n          if (result.value.error) {\n            if (channelStatusTracker[result.value.channel]) channelStatusTracker[result.value.channel].status = 'error';\n            continue;\n          }\n          const { channel, blocks } = result.value;`
);

// 7. Enhance the system report
const reportEndpointFind = `        network_stats: {
          public_api_requests: apiStats.public.totalRequests,
          premium_api_requests: apiStats.premium.totalRequests,
          banned_ips_count: apiStats.bannedIPsCount,
          active_websocket_connections: io.engine ? io.engine.clientsCount : 0
        },
        recent_critical_errors: recentErrors
      };`;

const reportEndpointReplace = `        network_stats: {
          public_api_requests: apiStats.public.totalRequests,
          premium_api_requests: apiStats.premium.totalRequests,
          banned_ips_count: apiStats.bannedIPsCount,
          active_websocket_connections: io.engine ? io.engine.clientsCount : 0,
          error_rate_percentage: apiStats.public.totalRequests > 0 ? ((apiStats.bannedIPsCount / apiStats.public.totalRequests) * 100).toFixed(2) : "0.00"
        },
        channels_breakdown: Object.entries(channelStatusTracker).map(([channel, stats]) => ({
          channel,
          status: stats.status,
          last_post_minutes_ago: stats.last_post_time > 0 ? Math.floor((Date.now() - stats.last_post_time) / 60000) : null,
          messages_processed: stats.messages_processed
        })),
        app_metadata: {
          app_version: process.env.npm_package_version || "1.0.0",
          environment: process.env.NODE_ENV || "development"
        },
        recent_critical_errors: recentErrors.reduce((acc: any[], err: any) => {
          const existing = acc.find((e: any) => e.message === err.message && e.context === err.context);
          if (existing) {
            existing.occurrences_count = (existing.occurrences_count || 1) + 1;
            existing.latest_occurrence = err.created_at;
          } else {
            acc.push({ ...err, occurrences_count: 1, latest_occurrence: err.created_at });
          }
          return acc;
        }, [])
      };`;

serverFile = serverFile.replace(reportEndpointFind, reportEndpointReplace);

// 8. Add Database error_logs count ping
const dbStatsFind = `          const [parallel, official] = await Promise.all([
            supabase.from('parallel_rates').select('*', { count: 'exact', head: true }),
            supabase.from('official_rates').select('*', { count: 'exact', head: true })
          ]);
          dbStats = {
            parallel_rates: parallel.count || 0,
            official_rates: official.count || 0
          };`;

const dbStatsReplace = `          const pingStart = Date.now();
          const [parallel, official, errorLogsQuery] = await Promise.all([
            supabase.from('parallel_rates').select('*', { count: 'exact', head: true }),
            supabase.from('official_rates').select('*', { count: 'exact', head: true }),
            supabase.from('error_logs').select('*', { count: 'exact', head: true })
          ]);
          const ping_ms = Date.now() - pingStart;
          dbStats = {
            parallel_rates: parallel.count || 0,
            official_rates: official.count || 0,
            error_logs_count: errorLogsQuery.count || 0,
            ping_ms
          };`;

serverFile = serverFile.replace(dbStatsFind, dbStatsReplace);


fs.writeFileSync('server.ts', serverFile);
console.log('Patch applied successfully');
