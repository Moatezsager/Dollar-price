const fs = require('fs');
let tc = fs.readFileSync('telegramClient.ts', 'utf8');

// For Error 1: 406 AUTH_KEY_DUPLICATED
// This error happens when GramJS tries to use the exact same session string across two different active connections.
// If the app restarts quickly, the old connection might still be registered on Telegram's servers.
// Adding a check and destroying the old client correctly.

const getClientTarget = `  public async getClient(): Promise<TelegramClient | null> {`;
const getClientPatch = `  public async getClient(): Promise<TelegramClient | null> {
    if (this.isConnecting) {
      console.log("[TelegramManager] Already connecting, waiting...");
      // Simple wait loop to avoid parallel connections
      for (let i = 0; i < 20; i++) {
        await new Promise(r => setTimeout(r, 500));
        if (!this.isConnecting) break;
      }
      if (this.client && this.client.connected) return this.client;
    }
`;

if (tc.includes(getClientTarget) && !tc.includes("Already connecting, waiting")) {
  tc = tc.replace(getClientTarget, getClientPatch);
}

// When connecting, we should catch AUTH_KEY_DUPLICATED and mark the session as invalid or just backoff longer.
const connectTarget = `        console.log("[TelegramManager] Telegram client connected and authorized successfully.");`;
const catchTarget = `      } catch (err: any) {`;
const catchPatch = `      } catch (err: any) {
        if (err?.message?.includes('AUTH_KEY_DUPLICATED')) {
           console.error("[TelegramManager] CRITICAL: AUTH_KEY_DUPLICATED. Session string is in use by another instance. Backing off for 5 minutes.");
           this.lastFailureTime = now + (5 * 60 * 1000); // 5 minutes backoff
        }
`;

if (tc.includes(catchTarget) && !tc.includes("AUTH_KEY_DUPLICATED")) {
  tc = tc.replace(catchTarget, catchPatch);
}

fs.writeFileSync('telegramClient.ts', tc, 'utf8');
console.log('Patched telegramClient.ts');
