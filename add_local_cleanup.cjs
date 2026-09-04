const fs = require('fs');

let serverTs = fs.readFileSync('server.ts', 'utf8');

const injectionCode = `
// ==========================================
// Local Database Maintenance (Auto-Vacuum)
// ==========================================
const cleanupLocalDatabase = () => {
  try {
    console.log("[Local DB] Running scheduled cleanup and VACUUM...");
    
    // Delete analytics older than 60 days
    const analyticsResult = db.prepare(\`
      DELETE FROM analytics_events 
      WHERE created_at < datetime('now', '-60 days')
    \`).run();
    if (analyticsResult.changes > 0) {
      console.log(\`[Local DB] Deleted \${analyticsResult.changes} old analytics events.\`);
    }

    // Delete messages older than 60 days
    const messagesResult = db.prepare(\`
      DELETE FROM messages 
      WHERE created_at < datetime('now', '-60 days')
    \`).run();
    if (messagesResult.changes > 0) {
      console.log(\`[Local DB] Deleted \${messagesResult.changes} old messages.\`);
    }

    // Run VACUUM to reclaim space
    db.exec('VACUUM');
    console.log("[Local DB] VACUUM completed successfully.");
    
  } catch (error) {
    console.error("[Local DB] Error during cleanup:", error);
  }
};

// Schedule it to run at 3:00 AM every day
cron.schedule('0 3 * * *', cleanupLocalDatabase);

`;

const targetAnchor = 'async function startServer() {';

if (serverTs.includes(targetAnchor)) {
  serverTs = serverTs.replace(targetAnchor, injectionCode + targetAnchor);
  fs.writeFileSync('server.ts', serverTs, 'utf8');
  console.log('Local DB cleanup job added successfully.');
} else {
  console.log('Anchor not found');
}
