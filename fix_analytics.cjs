const fs = require('fs');
let c = fs.readFileSync('server.ts', 'utf8');

const regex = /app\.get\("\/api\/admin\/analytics", requireAdmin, \(req: express\.Request, res: express\.Response\) => \{\s*try \{\s*const days = parseInt\(req\.query\.days as string\) \|\| 7;\s*const cutoff = new Date\(\);\s*cutoff\.setDate\(cutoff\.getDate\(\) - days\);\s*const cutoffIso = cutoff\.toISOString\(\);\s*const events = db\.prepare\(`\s*SELECT \* FROM analytics_events \s*WHERE created_at >= \?\s*ORDER BY created_at ASC\s*`\)\.all\(cutoffIso\) as any\[\];/m;

const replacement = `app.get("/api/admin/analytics", requireAdmin, async (req: express.Request, res: express.Response) => {
    try {
      const days = parseInt(req.query.days as string) || 7;
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      const cutoffIso = cutoff.toISOString();

      let events: any[] = [];
      let usedSupabase = false;

      if (supabase) {
        try {
          const { data, error } = await supabase
            .from('visitor_logs')
            .select('*')
            .gte('created_at', cutoffIso)
            .order('created_at', { ascending: true });
            
          if (error) {
             console.error("[Analytics] Supabase query failed, falling back to local SQLite", error);
          } else if (data) {
             events = data;
             usedSupabase = true;
          }
        } catch (supaErr) {
           console.error("[Analytics] Error communicating with Supabase, falling back to local SQLite", supaErr);
        }
      }

      if (!usedSupabase) {
        events = db.prepare(\`
          SELECT * FROM analytics_events 
          WHERE created_at >= ?
          ORDER BY created_at ASC
        \`).all(cutoffIso) as any[];
      }`;

c = c.replace(regex, replacement);

fs.writeFileSync('server.ts', c);
console.log("Done fixing analytics");
