const Database = require('better-sqlite3');
const db = new Database('messages.db');

const info = db.prepare(`
  DELETE FROM analytics_events 
  WHERE device_type = 'Bot' 
     OR browser_name LIKE '%bot%' 
     OR browser_name LIKE '%facebook%'
     OR browser_name LIKE '%crawler%'
     OR os_name LIKE '%bot%'
`).run();

console.log(`Cleaned ${info.changes} bot records from analytics_events.`);
