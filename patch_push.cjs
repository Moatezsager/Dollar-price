const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

if (!code.includes('import webpush from "web-push";')) {
  code = code.replace('import "dotenv/config";', 'import "dotenv/config";\nimport webpush from "web-push";');
}

const dbInitCode = `
// Initialize Push Notifications
db.exec(\`
  CREATE TABLE IF NOT EXISTS server_config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS push_subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    endpoint TEXT UNIQUE NOT NULL,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    last_active DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
\`);

let vapidKeys = { publicKey: '', privateKey: '' };
const storedKeys = db.prepare('SELECT value FROM server_config WHERE key = ?').get('vapid_keys');
if (storedKeys) {
  vapidKeys = JSON.parse(storedKeys.value);
} else {
  vapidKeys = webpush.generateVAPIDKeys();
  db.prepare('INSERT INTO server_config (key, value) VALUES (?, ?)').run('vapid_keys', JSON.stringify(vapidKeys));
}

webpush.setVapidDetails(
  'mailto:admin@dinar-index.com',
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

app.get('/api/push/public-key', (req: express.Request, res: express.Response) => {
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
});

async function sendRetentionPushNotifications() {
  console.log('[Push] Checking for retention notifications...');
  try {
    // Users who haven't been active in the last 3 days, but were active in the last 4 days
    // to prevent spamming them every day.
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    const fourDaysAgo = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString();
    
    const subscriptions = db.prepare(\`
      SELECT endpoint, p256dh, auth FROM push_subscriptions 
      WHERE last_active < ? AND last_active > ?
    \`).all(threeDaysAgo, fourDaysAgo);
    
    console.log(\`[Push] Found \${subscriptions.length} users to remind.\`);
    
    const payload = JSON.stringify({
      title: 'مؤشر الدينار',
      body: 'أسعار اليوم تغيرت، تفضل بالمتابعة',
      url: '/'
    });
    
    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification({
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth
          }
        }, payload);
      } catch (err: any) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          // Subscription expired or invalid
          db.prepare('DELETE FROM push_subscriptions WHERE endpoint = ?').run(sub.endpoint);
        }
      }
    }
  } catch (err) {
    console.error('[Push] Retention error:', err);
  }
}

cron.schedule('0 10 * * *', () => {
  sendRetentionPushNotifications();
}, {
  scheduled: true,
  timezone: "Africa/Tripoli"
});
`;

if (!code.includes('CREATE TABLE IF NOT EXISTS push_subscriptions')) {
  code = code.replace(
    '// Create installs table if not exists',
    dbInitCode + '\n// Create installs table if not exists'
  );
}

fs.writeFileSync('server.ts', code);
console.log('patched push notifications into server.ts');
