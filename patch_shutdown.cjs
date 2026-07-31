const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const shutdownCode = `
// Graceful shutdown handling
process.on('SIGTERM', async () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  const { activeClient } = require('./telegramClient');
  if (activeClient) {
    try {
      console.log('Disconnecting Telegram Client...');
      await activeClient.disconnect();
    } catch (e) {}
  }
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received. Shutting down gracefully...');
  const { activeClient } = require('./telegramClient');
  if (activeClient) {
    try {
      console.log('Disconnecting Telegram Client...');
      await activeClient.disconnect();
    } catch (e) {}
  }
  process.exit(0);
});
`;

if (!code.includes('SIGTERM received')) {
  code = code.replace(
    'startMonitoring();',
    shutdownCode + '\nstartMonitoring();'
  );
  fs.writeFileSync('server.ts', code);
  console.log('Patched shutdown handler');
} else {
  console.log('Already patched');
}
