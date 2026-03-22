import { TelegramClient, Api } from "telegram";
import { StringSession } from "telegram/sessions";

// We will store the active client here to reuse it
let activeClient: TelegramClient | null = null;

export const getTelegramClient = async (
  apiId: number,
  apiHash: string,
  sessionString: string
): Promise<TelegramClient | null> => {
  if (activeClient && activeClient.connected) {
    return activeClient;
  }

  if (!apiId || !apiHash || !sessionString) {
    return null;
  }

  let client: TelegramClient | null = null;
  try {
    const stringSession = new StringSession(sessionString);
    client = new TelegramClient(stringSession, apiId, apiHash, {
      connectionRetries: 5,
      useWSS: false,
    });

    await client.connect();
    
    const isAuthorized = await client.checkAuthorization();
    if (!isAuthorized) {
      console.warn("[GramJS] Client connected but not authorized. Session might be invalid.");
      try { await client.disconnect(); } catch (e) {}
      // We can't use logErrorArabic here easily, but we can throw an error to be caught by the caller
      throw new Error("Client connected but not authorized. Session might be invalid.");
    }
    
    activeClient = client;
    return client;
  } catch (error) {
    console.error("Failed to connect Telegram client:", error);
    // If we have a client object, try to disconnect it
    if (client) {
      try { await client.disconnect(); } catch (e) {}
    }
    throw error; // Throw the error so the caller can log it
  }
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
