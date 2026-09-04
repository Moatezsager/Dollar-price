const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const importStr = `import Database from 'better-sqlite3';`;
const uapImportStr = `import Database from 'better-sqlite3';\nimport UAParser from 'ua-parser-js';\nimport crypto from 'crypto';`;

if (code.includes(importStr) && !code.includes('ua-parser-js')) {
    code = code.replace(importStr, uapImportStr);
}

const routesStr = `  app.post("/api/admin/cleanup", requireAdmin, async (req: express.Request, res: express.Response) => {`;
const analyticsRoutesStr = `  // Analytics Tracking Endpoint
  app.post("/api/analytics/track", (req: express.Request, res: express.Response) => {
    try {
      const { sessionId, pagePath, referrer } = req.body;
      const uaString = req.headers['user-agent'] || '';
      const ip = (req.headers["x-forwarded-for"] || req.socket.remoteAddress || "").toString().split(',')[0].trim();
      
      const parser = new UAParser(uaString);
      const result = parser.getResult();
      
      const visitorId = crypto.createHash('sha256').update(ip + result.browser.name + result.os.name).digest('hex').substring(0, 16);
      
      let deviceType = result.device.type || 'Desktop';
      if (!result.device.type) {
         if (/mobile/i.test(uaString)) deviceType = 'Mobile';
         else if (/tablet|ipad/i.test(uaString)) deviceType = 'Tablet';
         else deviceType = 'Desktop';
      }
      
      if (/bot|crawler|spider|googlebot|bingbot/i.test(uaString)) deviceType = 'Bot';

      db.prepare(\`
        INSERT INTO analytics_events 
        (visitor_id, session_id, page_path, referrer, device_type, device_vendor, device_model, os_name, os_version, browser_name, browser_version)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      \`).run(
        visitorId, 
        sessionId || visitorId, 
        pagePath || '/', 
        referrer || '', 
        deviceType,
        result.device.vendor || '',
        result.device.model || '',
        result.os.name || '',
        result.os.version || '',
        result.browser.name || '',
        result.browser.version || ''
      );
      
      res.json({ success: true });
    } catch (err) {
      console.error("[Analytics] Error tracking event:", err);
      res.status(500).json({ success: false });
    }
  });

  // Admin Analytics Dashboard Data
  app.get("/api/admin/analytics", requireAdmin, (req: express.Request, res: express.Response) => {
    try {
      const days = parseInt(req.query.days as string) || 7;
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      const cutoffIso = cutoff.toISOString();

      const events = db.prepare(\`
        SELECT * FROM analytics_events 
        WHERE created_at >= ?
        ORDER BY created_at ASC
      \`).all(cutoffIso) as any[];

      // Aggregations
      const dailyStats: Record<string, { pageviews: number, uniqueVisitors: Set<string> }> = {};
      const deviceTypes: Record<string, number> = {};
      const browsers: Record<string, number> = {};
      const os: Record<string, number> = {};
      
      const allUniqueVisitors = new Set<string>();

      events.forEach(e => {
        const dateStr = e.created_at.split(' ')[0] || e.created_at.split('T')[0];
        if (!dailyStats[dateStr]) {
           dailyStats[dateStr] = { pageviews: 0, uniqueVisitors: new Set() };
        }
        
        dailyStats[dateStr].pageviews++;
        dailyStats[dateStr].uniqueVisitors.add(e.visitor_id);
        allUniqueVisitors.add(e.visitor_id);
        
        deviceTypes[e.device_type] = (deviceTypes[e.device_type] || 0) + 1;
        
        const bName = e.browser_name || 'Unknown';
        browsers[bName] = (browsers[bName] || 0) + 1;
        
        const oName = e.os_name || 'Unknown';
        os[oName] = (os[oName] || 0) + 1;
      });

      const trend = Object.keys(dailyStats).map(date => ({
        date,
        pageviews: dailyStats[date].pageviews,
        visitors: dailyStats[date].uniqueVisitors.size
      }));

      res.json({
        success: true,
        summary: {
          totalPageviews: events.length,
          totalVisitors: allUniqueVisitors.size,
        },
        trend,
        deviceTypes,
        browsers,
        os
      });
    } catch (err) {
      console.error("[Analytics] Error fetching dashboard data:", err);
      res.status(500).json({ success: false });
    }
  });

  app.post("/api/admin/cleanup", requireAdmin, async (req: express.Request, res: express.Response) => {`;

if (code.includes(routesStr) && !code.includes('/api/analytics/track')) {
    code = code.replace(routesStr, analyticsRoutesStr);
    fs.writeFileSync('server.ts', code, 'utf8');
    console.log("Patched server.ts with analytics routes.");
} else {
    console.log("Could not patch analytics routes or already patched.");
}
