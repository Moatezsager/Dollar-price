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
    const messages = await client.getMessages(channelUsername, {
      limit: limit,
    });
    return messages
      .filter((m) => m.message && m.message.trim() !== "")
      .map((m) => ({
        text: m.message || "",
        date: m.date ? m.date * 1000 : Date.now(), // GramJS date is in seconds
      }));
  } catch (error) {
    console.error(`Error fetching messages from ${channelUsername} via GramJS:`, error);
    return [];
  }
};
