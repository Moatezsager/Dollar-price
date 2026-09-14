import { TelegramClient, Api } from "telegram";
import { StringSession } from "telegram/sessions";

const apiId = 37876956;
const apiHash = "0e9d1601dd10c87ca3b3b6886cb53cb2";
const sessionString = "1BAAOMTQ5LjE1NC4xNjcuOTEAUA0fwgo4sRrh4Gi+4smx8N1ex3y1r1C+r+AdcytVrvaL5bBlTU3tB68RGsLVcSiXfTDZ3rzRLnk8kzzJb5WydfDTO4gpivuSVa9DyPZmlaBGd3SW/uns+dpH1AmEXqTaG2/1BYZv0LThGh564S5H4TOddjgIdSgEqbqCzLCWjuO5yvSvcqmUyQdEwsUclf7DFEwZOGoRAMMr90/nNGbkh/NZE0fb1SIiN5kFBEXHcbCmY20lFRRKnbdybf9AniOLfEWgfBUKcQOgbE2lsThQg/Z23JMLt/XrPD2mOvSvp5mFvkOpjLBC5bjuPw1x3CoiN4hWLz8dMZW8FamdbK8LUB0=";

(async () => {
  const client = new TelegramClient(new StringSession(sessionString), apiId, apiHash, {
    connectionRetries: 1,
  });
  await client.connect();
  try {
    await client.sendMessage("libya_index_dollar", { message: "Test Broadcast from API" });
    console.log("Success telegram");
  } catch(e) {
    console.log("Error telegram:", e);
  }
  process.exit(0);
})();
