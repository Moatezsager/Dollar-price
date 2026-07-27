const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const targetStr = `  app.get("/api/admin/error-logs", requireAdmin, async (req: express.Request, res: express.Response) => {`;
const replaceStr = `  app.delete("/api/admin/error-logs", requireAdmin, async (req: express.Request, res: express.Response) => {
    if (!supabase || !supabaseAnonKey || supabaseAnonKey.includes('dummy')) {
      return res.json({ success: false, message: "قاعدة البيانات غير متصلة" });
    }
    try {
      const { error } = await supabase
        .from('error_logs')
        .delete()
        .neq('id', 0);
      
      if (error) throw error;
      res.json({ success: true, message: "تم تنظيف السجلات بنجاح" });
    } catch (err) {
      console.error("Error clearing logs:", err);
      if (!res.headersSent) {
        res.status(500).json({ success: false, message: "فشل تنظيف السجلات" });
      }
    }
  });

  app.get("/api/admin/error-logs", requireAdmin, async (req: express.Request, res: express.Response) => {`;

code = code.replace(targetStr, replaceStr);
fs.writeFileSync('server.ts', code);
console.log('patched server.ts for clearing logs');
