const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const tableStr = `// Create installs table if not exists`;
const analyticsTableStr = `// Create Analytics tables
db.exec(\`
  CREATE TABLE IF NOT EXISTS analytics_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    visitor_id TEXT NOT NULL,
    session_id TEXT NOT NULL,
    page_path TEXT NOT NULL,
    referrer TEXT,
    device_type TEXT,
    device_vendor TEXT,
    device_model TEXT,
    os_name TEXT,
    os_version TEXT,
    browser_name TEXT,
    browser_version TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  
  CREATE INDEX IF NOT EXISTS idx_analytics_created_at ON analytics_events(created_at);
  CREATE INDEX IF NOT EXISTS idx_analytics_visitor_id ON analytics_events(visitor_id);
\`);

// Create installs table if not exists`;

if (code.includes(tableStr) && !code.includes('analytics_events')) {
    code = code.replace(tableStr, analyticsTableStr);
    fs.writeFileSync('server.ts', code, 'utf8');
    console.log("Patched server.ts with analytics table.");
} else {
    console.log("Could not patch analytics table or already patched.");
}
