import { TelegramClient, Api } from "telegram";
import { StringSession } from "telegram/sessions";

// We will store the active client here to reuse it
export let activeClient: TelegramClient | null = null;
let connectingPromise: Promise<TelegramClient | null> | null = null;

export const getTelegramClient = async (
  apiId: number,
  apiHash: string,
  sessionString: string
): Promise<TelegramClient | null> => {
  // 1. Return existing connected client immediately
  if (activeClient && activeClient.connected) {
    return activeClient;
  }

  // 2. If we are already in the process of connecting, wait for that specific promise
  if (connectingPromise) {
    console.log("[GramJS] Connection already in progress, waiting...");
    try {
      return await connectingPromise;
    } catch (e) {
      // If the existing promise failed, we'll fall through and try again below
      console.warn("[GramJS] Previous connection attempt failed, retrying...");
    }
  }

  if (!apiId || !apiHash || !sessionString) {
    return null;
  }

  connectingPromise = (async () => {
    let lastError: any = null;
    const maxRetries = 2; // Reduced retries to avoid long blocking

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      let client: TelegramClient | null = null;
      try {
        console.log(`[GramJS] Connection Attempt ${attempt}/${maxRetries}...`);
        
        // If we have an old client that's not connected, try to disconnect it properly first
        if (activeClient) {
          try { await activeClient.disconnect(); } catch (e) {}
          activeClient = null;
        }

        const stringSession = new StringSession(sessionString);
        client = new TelegramClient(stringSession, apiId, apiHash, {
          connectionRetries: 3,
          useWSS: false,
          autoReconnect: true,
          floodSleepThreshold: 60,
        });

        await client.connect();
        
        const isAuthorized = await client.checkAuthorization();
        if (!isAuthorized) {
          throw new Error("Connected but NOT authorized. Session may be expired.");
        }
        
        activeClient = client;
        console.log("[GramJS] Successfully connected and authorized.");
        return client;
      } catch (error) {
        lastError = error;
        const errorStr = String(error);
        console.error(`[GramJS] Attempt ${attempt} failed:`, errorStr);
        
        if (client) {
          try { await client.disconnect(); } catch (e) {}
        }

        // If it's a key duplication error, wait longer and retry
        if (errorStr.includes("406") || errorStr.includes("AUTH_KEY_DUPLICATED")) {
           if (attempt < maxRetries) {
             const delay = 60000 + (Math.random() * 20000); // 60-80 seconds
             console.warn(`[GramJS] Session conflict (406). Waiting ${Math.round(delay/1000)}s for Telegram to clear old session...`);
             await new Promise(resolve => setTimeout(resolve, delay));
             continue; 
           }
        }
        
        throw error;
      }
    }
    
    throw lastError || new Error("Failed to connect after all attempts.");
  })();

  try {
    const result = await connectingPromise;
    return result;
  } catch (err) {
    console.error("[GramJS] Final connection error:", err instanceof Error ? err.message : String(err));
    return null;
  } finally {
    connectingPromise = null;
  }
};

export const initializeTelegram = async (): Promise<TelegramClient | null> => {
  const apiId = Number(process.env.TELEGRAM_API_ID);
  const apiHash = process.env.TELEGRAM_API_HASH || "";
  const sessionString = process.env.TELEGRAM_SESSION || "";

  if (!apiId || !apiHash || !sessionString) {
    console.warn("[GramJS] Telegram environment variables missing (TELEGRAM_API_ID, TELEGRAM_API_HASH, TELEGRAM_SESSION).");
    return null;
  }

  return getTelegramClient(apiId, apiHash, sessionString);
};

export const fetchChannelMessages = async (
  client: TelegramClient,
  channelUsername: string,
  limit: number = 10
): Promise<{text: string, date: number}[]> => {
  try {
    console.log(`[GramJS] Fetching messages from ${channelUsername}...`);
    
    // Ensure the channel username is clean
    const username = channelUsername.replace('@', '').trim();
    
    // Try to get the entity first to ensure it's resolved and accessible
    let entity;
    try {
      entity = await client.getEntity(username);
    } catch (e) {
      console.warn(`[GramJS] Could not get entity for ${username}, trying to resolve username:`, e instanceof Error ? e.message : String(e));
      try {
        const resolved = await client.invoke(new Api.contacts.ResolveUsername({ username }));
        if (resolved && resolved.chats && resolved.chats.length > 0) {
          entity = resolved.chats[0];
        } else {
          entity = username;
        }
      } catch (innerError) {
        console.warn(`[GramJS] Failed to resolve username ${username}:`, innerError instanceof Error ? innerError.message : String(innerError));
        entity = username;
      }
    }

    const messages = await client.getMessages(entity, {
      limit: limit,
    });
    
    console.log(`[GramJS] Successfully fetched ${messages.length} messages from ${channelUsername}.`);
    
    return messages
      .filter((m) => m.message && m.message.trim() !== "")
      .map((m) => ({
        text: m.message || "",
        date: m.date ? m.date * 1000 : Date.now(), // GramJS date is in seconds
      }));
  } catch (error) {
    console.error(`Error fetching messages from ${channelUsername} via GramJS:`, error instanceof Error ? error.message : String(error));
    return [];
  }
};
