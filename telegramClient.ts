import { TelegramClient, Api } from "telegram";
import { StringSession } from "telegram/sessions";

// We will store the active client here to reuse it
export let activeClient: TelegramClient | null = null;
let connectingPromise: Promise<TelegramClient | null> | null = null;

export const getTelegramClient = async (
  apiId: number,
  apiHash: string,
  sessionString: string,
  retryCount = 0
): Promise<TelegramClient | null> => {
  if (activeClient && activeClient.connected) {
    return activeClient;
  }

  // If we are already connecting, wait for that to finish
  if (connectingPromise) {
    console.log("[GramJS] Already connecting, waiting for existing promise...");
    return connectingPromise;
  }

  if (!apiId || !apiHash || !sessionString) {
    return null;
  }

  connectingPromise = (async () => {
    let client: TelegramClient | null = null;
    try {
      console.log(`[GramJS] Creating new Telegram client (Attempt ${retryCount + 1})...`);
      const stringSession = new StringSession(sessionString);
      client = new TelegramClient(stringSession, apiId, apiHash, {
        connectionRetries: 5,
        useWSS: false,
        autoReconnect: true,
      });

      await client.connect();
      
      const isAuthorized = await client.checkAuthorization();
      if (!isAuthorized) {
        console.warn("[GramJS] Client connected but not authorized. Session might be invalid.");
        try { await client.disconnect(); } catch (e) {}
        throw new Error("Client connected but not authorized. Session might be invalid.");
      }
      
      activeClient = client;
      console.log("[GramJS] Successfully connected and authorized.");
      return client;
    } catch (error) {
      const errorStr = String(error);
      console.error(`[GramJS] Connection failed (Attempt ${retryCount + 1}):`, errorStr);
      
      if (client) {
        try { await client.disconnect(); } catch (e) {}
      }

      // Handle AUTH_KEY_DUPLICATED (406) or other fatal but temporary errors
      if ((errorStr.includes("406") || errorStr.includes("AUTH_KEY_DUPLICATED")) && retryCount < 3) {
        const delay = 35000 + (Math.random() * 10000); // 35-45 seconds delay
        console.warn(`[GramJS] AUTH_KEY_DUPLICATED detected. The session is likely active in another instance. Waiting ${Math.round(delay/1000)}s before retry...`);
        
        connectingPromise = null; // Reset promise so next attempt works
        await new Promise(resolve => setTimeout(resolve, delay));
        return getTelegramClient(apiId, apiHash, sessionString, retryCount + 1);
      }
      
      throw error;
    } finally {
      // Only clear the global lock if we are at the top level call and not in a retry sequence
      if (retryCount === 0) {
         connectingPromise = null;
      }
    }
  })();

  return connectingPromise;
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
