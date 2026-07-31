const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const routes = `app.get('/api/push/public-key', (req: express.Request, res: express.Response) => {
  res.json({ publicKey: vapidKeys.publicKey });
});

app.post('/api/push/subscribe', (req: express.Request, res: express.Response) => {
  try {
    const { subscription } = req.body;
    if (!subscription || !subscription.endpoint) return res.status(400).json({ error: 'Invalid subscription' });
    
    const { endpoint, keys } = subscription;
    const { p256dh, auth } = keys;
    
    db.prepare(\`
      INSERT INTO push_subscriptions (endpoint, p256dh, auth, last_active) 
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(endpoint) DO UPDATE SET last_active = CURRENT_TIMESTAMP
    \`).run(endpoint, p256dh, auth);
    
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/push/active', (req: express.Request, res: express.Response) => {
  try {
    const { endpoint } = req.body;
    if (endpoint) {
      db.prepare('UPDATE push_subscriptions SET last_active = CURRENT_TIMESTAMP WHERE endpoint = ?').run(endpoint);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update' });
  }
});`;

code = code.replace(routes, '');

const target = `  app.get("/api/ping", (req, res) => {`;
code = code.replace(target, routes + '\n\n' + target);

fs.writeFileSync('server.ts', code);
console.log('Fixed push routes');
