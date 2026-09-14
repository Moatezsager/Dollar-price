import { getTelegramManager } from './telegramClient';
import { readFileSync } from 'fs';

async function run() {
  const res = await fetch("http://localhost:3000/api/temp-config");
  const data = await res.json();
  if (!data.telegramSessionString) {
     console.log("No session string");
     process.exit(1);
  }
  console.log("Using API ID:", data.telegramApiId);
  const manager = getTelegramManager(Number(data.telegramApiId), data.telegramApiHash, data.telegramSessionString);
  try {
     console.log("Connecting...");
     const msgs = await manager.fetchMessages("dollarr_ly", 2);
     console.log("Messages fetched:", msgs.length);
     console.log(msgs);
  } catch (err: any) {
     console.error("Error connecting:", err.message);
  }
  process.exit(0);
}
run();
