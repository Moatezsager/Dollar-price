const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const installEndpoint = `
  app.post("/api/track/install", (req: express.Request, res: express.Response) => {
    try {
      const { platform } = req.body;
      const userAgent = req.headers['user-agent'] || '';
      
      const insert = db.prepare('INSERT INTO installs (platform, user_agent) VALUES (?, ?)');
      insert.run(platform || 'unknown', userAgent);
      
      res.json({ success: true });
    } catch (err: any) {
      console.error("Error tracking install:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });
`;

if (!code.includes('/api/track/install')) {
  code = code.replace(
    'app.post("/api/logs/error",',
    installEndpoint + '\n  app.post("/api/logs/error",'
  );
  fs.writeFileSync('server.ts', code);
  console.log('patched server.ts with install tracking endpoint');
} else {
  console.log('install tracking endpoint already exists');
}
