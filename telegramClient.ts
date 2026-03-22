import { TelegramClient } from "telegram";
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

  try {
    const stringSession = new StringSession(sessionString);
    const client = new TelegramClient(stringSession, apiId, apiHash, {
      connectionRetries: 5,
      useWSS: false,
    });

    await client.connect();
    activeClient = client;
    return client;
  } catch (error) {
    console.error("Failed to connect Telegram client:", error);
    return null;
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
      console.warn(`[GramJS] Could not get entity for ${username}, trying direct fetch:`, e instanceof Error ? e.message : String(e));
      entity = username;
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
