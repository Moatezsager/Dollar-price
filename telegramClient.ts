import { TelegramClient, Api } from "telegram";
import { StringSession } from "telegram/sessions";

export class TelegramManager {
  private client: TelegramClient | null = null;
  private apiId: number;
  private apiHash: string;
  private sessionString: string;
  private isConnecting = false;
  private lastFailureTime = 0;
  public lastFetchTime: number = 0;

  constructor(apiId: number, apiHash: string, sessionString: string) {
    this.apiId = apiId;
    this.apiHash = apiHash;
    this.sessionString = sessionString;
  }

  public updateCredentials(apiId: number, apiHash: string, sessionString: string) {
    if (this.apiId !== apiId || this.apiHash !== apiHash || this.sessionString !== sessionString) {
      console.log("[TelegramManager] Credentials updated, will reconnect on next request.");
      this.apiId = apiId;
      this.apiHash = apiHash;
      this.sessionString = sessionString;
      // Force a new client on next getClient()
      if (this.client) {
        this.client.disconnect().catch(() => {});
        this.client = null;
        activeClient = null;
      }
    }
  }

  /**
   * Gets or creates the Telegram client instance.
   * Implements connection stability and authorization checks.
   */
  public async getClient(): Promise<TelegramClient | null> {
    // If already connected and authorized, return it
    if (this.client && this.client.connected) {
      try {
        const isAuthorized = await this.client.checkAuthorization();
        if (isAuthorized) {
          activeClient = this.client;
          return this.client;
        }
      } catch (e) {
        console.warn("[TelegramManager] Authorization check failed, re-connecting...");
      }
    }

    // Cooldown check to prevent rapid reconnection loops
    const now = Date.now();
    if (now - this.lastFailureTime < 30000) {
      console.warn(`[TelegramManager] In cooldown period (${Math.ceil((30000 - (now - this.lastFailureTime)) / 1000)}s remaining), skipping connection attempt.`);
      return null;
    }

    // Handle concurrent connection attempts
    if (this.isConnecting) {
      console.log("[TelegramManager] Connection already in progress, waiting...");
      let attempts = 0;
      while (this.isConnecting && attempts < 20) {
        await new Promise(resolve => setTimeout(resolve, 500));
        attempts++;
      }
      if (this.client && this.client.connected) return this.client;
    }

    this.isConnecting = true;
    try {
      console.log("[TelegramManager] Initializing new Telegram client...");
      
      if (this.client) {
        try { await this.client.disconnect(); } catch (e) {}
      }

      const stringSession = new StringSession(this.sessionString || "");
      this.client = new TelegramClient(stringSession, this.apiId, this.apiHash, {
        connectionRetries: 10,
        useWSS: false,
        autoReconnect: true,
        floodSleepThreshold: 120,
        deviceModel: "PriceScraperServer",
        systemVersion: "1.0.0",
        appVersion: "1.0.0",
      });

      // Set up event listeners for stability
      this.client.addEventHandler((event) => {
        // Log important events if needed
      });

      await this.client.connect();
      
      const isAuthorized = await this.client.checkAuthorization();
      if (!isAuthorized) {
        throw new Error("Session is not authorized. Please check your session string.");
      }
      
      console.log("[TelegramManager] Successfully connected and authorized.");
      activeClient = this.client;
      return this.client;
    } catch (error: any) {
      const errorMsg = error.message || String(error);
      console.error("[TelegramManager] Connection failed:", errorMsg);
      
      if (errorMsg.includes("AUTH_KEY_DUPLICATED")) {
        console.error("[TelegramManager] CRITICAL: Auth key is duplicated. This session is being used by another client. Waiting 10s before cleanup...");
        await new Promise(resolve => setTimeout(resolve, 10000));
      }
      
      if (this.client) {
        try { await this.client.disconnect(); } catch (e) {}
      }
      this.client = null;
      activeClient = null;
      this.lastFailureTime = Date.now();
      return null;
    } finally {
      this.isConnecting = false;
    }
  }

  /**
   * Fetches messages from a channel with robust error handling.
   */
  public async fetchMessages(channelUsername: string, limit: number = 10): Promise<{text: string, date: number}[]> {
    const client = await this.getClient();
    if (!client) {
      console.error(`[TelegramManager] Cannot fetch messages from ${channelUsername}: Client not ready.`);
      return [];
    }

    try {
      const username = channelUsername.replace('@', '').trim();
      let entity;
      
      // Try to get entity from cache/username
      try {
        entity = await client.getEntity(username);
      } catch (e) {
        console.log(`[TelegramManager] Entity not found for ${username}, resolving...`);
        const resolved = await client.invoke(new Api.contacts.ResolveUsername({ username }));
        if (resolved.chats && resolved.chats.length > 0) {
          entity = resolved.chats[0];
        } else if (resolved.users && resolved.users.length > 0) {
          entity = resolved.users[0];
        } else {
          entity = username;
        }
      }

      const messages = await client.getMessages(entity, { limit });
      this.lastFetchTime = Date.now();
      
      return messages
        .filter((m) => m.message && m.message.trim() !== "")
        .map((m) => ({
          text: m.message || "",
          date: m.date ? m.date * 1000 : Date.now(),
        }));
    } catch (error: any) {
      console.error(`[TelegramManager] Error fetching messages from ${channelUsername}:`, error.message || error);
      
      // If it's a connection error, try to reconnect for next time
      if (error.message?.includes('connection') || error.message?.includes('disconnected')) {
        this.client = null;
        activeClient = null;
      }
      
      return [];
    }
  }

  public async disconnect(): Promise<void> {
    if (this.client) {
      try {
        await this.client.disconnect();
        console.log("[TelegramManager] Disconnected successfully.");
      } catch (e) {}
      this.client = null;
      activeClient = null;
    }
  }

  public isConnected(): boolean {
    return !!(this.client && this.client.connected);
  }
}

// Singleton and helper exports
export let activeClient: TelegramClient | null = null;
let managerInstance: TelegramManager | null = null;

/**
 * Gets the singleton TelegramManager instance.
 */
export const getTelegramManager = (
  apiId: number,
  apiHash: string,
  sessionString: string
): TelegramManager => {
  if (!managerInstance) {
    managerInstance = new TelegramManager(apiId, apiHash, sessionString);
  } else {
    // Update credentials if they changed
    managerInstance.updateCredentials(apiId, apiHash, sessionString);
  }
  return managerInstance;
};

/**
 * Gets a Telegram client using provided credentials.
 * Reuses existing manager if credentials match.
 */
export const getTelegramClient = async (
  apiId: number,
  apiHash: string,
  sessionString: string
): Promise<TelegramClient | null> => {
  const manager = getTelegramManager(apiId, apiHash, sessionString);
  return await manager.getClient();
};

/**
 * Initializes Telegram using environment variables.
 */
export const initializeTelegram = async (): Promise<TelegramClient | null> => {
  const apiId = Number(process.env.TELEGRAM_API_ID || process.env.VITE_TELEGRAM_API_ID);
  const apiHash = process.env.TELEGRAM_API_HASH || process.env.VITE_TELEGRAM_API_HASH;
  const sessionString = process.env.TELEGRAM_SESSION || process.env.TG_SESSION_V2 || process.env.VITE_TELEGRAM_SESSION;

  if (!apiId || !apiHash || !sessionString) {
    console.warn("[Telegram] Missing environment variables for initialization.");
    return null;
  }

  return await getTelegramClient(apiId, apiHash, sessionString);
};

/**
 * Helper to fetch messages from a channel.
 */
export const fetchChannelMessages = async (
  client: TelegramClient,
  channelUsername: string,
  limit: number = 10
): Promise<{text: string, date: number}[]> => {
  // We can't easily use the manager here if we only have the client,
  // but we can implement the logic directly.
  try {
    const username = channelUsername.replace('@', '').trim();
    const messages = await client.getMessages(username, { limit });
    return messages
      .filter((m) => m.message && m.message.trim() !== "")
      .map((m) => ({
        text: m.message || "",
        date: m.date ? m.date * 1000 : Date.now(),
      }));
  } catch (error) {
    console.error(`[Telegram] Error in fetchChannelMessages for ${channelUsername}:`, error);
    return [];
  }
};
