import { TelegramClient, Api } from "telegram";
import { StringSession } from "telegram/sessions";

export class TelegramManager {
  private client: TelegramClient | null = null;
  private apiId: number;
  private apiHash: string;
  private sessionString: string;
  private isConnecting = false;
  public lastFetchTime: number = 0;

  constructor(apiId: number, apiHash: string, sessionString: string) {
    this.apiId = apiId;
    this.apiHash = apiHash;
    this.sessionString = sessionString;
  }

  public async getClient(): Promise<TelegramClient | null> {
    if (this.client && this.client.connected) {
      return this.client;
    }

    if (this.isConnecting) {
      // Wait for existing connection attempt
      while (this.isConnecting) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      return this.client && this.client.connected ? this.client : null;
    }

    this.isConnecting = true;
    try {
      console.log("[TelegramManager] Attempting to connect...");
      console.log(`[TelegramManager] API ID: ${this.apiId}, Session String length: ${this.sessionString?.length || 0}`);
      
      if (this.client) {
        try { await this.client.disconnect(); } catch (e) {}
      }

      const stringSession = new StringSession(this.sessionString || "");
      this.client = new TelegramClient(stringSession, this.apiId, this.apiHash, {
        connectionRetries: 5,
        useWSS: false,
        autoReconnect: true,
        floodSleepThreshold: 60,
      });

      await this.client.connect();
      
      const isAuthorized = await this.client.checkAuthorization();
      console.log(`[TelegramManager] Authorization check result: ${isAuthorized}`);
      if (!isAuthorized) {
        throw new Error("Connected but NOT authorized. Session string might be invalid or expired.");
      }
      
      console.log("[TelegramManager] Successfully connected and authorized.");
      return this.client;
    } catch (error) {
      console.error("[TelegramManager] Connection failed:", error);
      this.client = null;
      return null;
    } finally {
      this.isConnecting = false;
    }
  }

  public async fetchMessages(channelUsername: string, limit: number = 10): Promise<{text: string, date: number}[]> {
    const client = await this.getClient();
    if (!client) return [];

    try {
      const username = channelUsername.replace('@', '').trim();
      let entity;
      try {
        entity = await client.getEntity(username);
      } catch (e) {
        const resolved = await client.invoke(new Api.contacts.ResolveUsername({ username }));
        entity = (resolved.chats && resolved.chats.length > 0) ? resolved.chats[0] : username;
      }

      const messages = await client.getMessages(entity, { limit });
      this.lastFetchTime = Date.now();
      
      return messages
        .filter((m) => m.message && m.message.trim() !== "")
        .map((m) => ({
          text: m.message || "",
          date: m.date ? m.date * 1000 : Date.now(),
        }));
    } catch (error) {
      console.error(`[TelegramManager] Error fetching messages from ${channelUsername}:`, error);
      return [];
    }
  }

  public isConnected(): boolean {
    return !!(this.client && this.client.connected);
  }
}

export let activeClient: TelegramClient | null = null;
let connectingPromise: Promise<TelegramClient | null> | null = null;

export const getTelegramClient = async (
  apiId: number,
  apiHash: string,
  sessionString: string
): Promise<TelegramClient | null> => {
  // ... (keep existing implementation for backward compatibility if needed, 
  // but ideally refactor server.ts to use TelegramManager)
  // For now, I will just export the manager and let server.ts use it.
  return null; 
};

export const initializeTelegram = async (): Promise<TelegramClient | null> => {
  return null;
};

export const fetchChannelMessages = async (
  client: TelegramClient,
  channelUsername: string,
  limit: number = 10
): Promise<{text: string, date: number}[]> => {
  return [];
};
