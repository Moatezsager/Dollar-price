import re

with open('server.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update AppConfig interface
old_interface = """  enableUserTracking?: boolean;
  apiConfig?: {"""
new_interface = """  enableUserTracking?: boolean;
  facebookPageId?: string;
  facebookAccessToken?: string;
  facebookAutoPost?: boolean;
  apiConfig?: {"""
if "facebookPageId" not in content:
    content = content.replace(old_interface, new_interface)

# 2. Add broadcastToSocialMedia function
helper_func = """
async function broadcastToSocialMedia(message: string, isTest: boolean = false) {
  // Telegram
  if (!isTest || isTest) {
    if (appConfig.telegramAutoPost || isTest) {
      try {
        if (appConfig.telegramPostChannel && telegramManager) {
          const success = await telegramManager.sendMessage(appConfig.telegramPostChannel, message);
          if (!success) console.error("[Telegram Broadcast] Failed to send message");
        }
      } catch (e) {
        console.error("[Telegram Broadcast] Failed to send message:", e);
      }
    }
  }

  // Facebook
  if (!isTest && appConfig.facebookAutoPost && appConfig.facebookPageId && appConfig.facebookAccessToken) {
     let fbMessage = message.replace(/[*_`]/g, '');
     
     // Optionally adjust some emojis or formatting for FB if needed
     try {
       const url = `https://graph.facebook.com/v20.0/${appConfig.facebookPageId}/feed`;
       const fbRes = await fetch(url, {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ message: fbMessage, access_token: appConfig.facebookAccessToken })
       });
       const fbData = await fbRes.json();
       if (fbData.error) {
         console.error("[Facebook Broadcast] Error:", fbData.error.message);
       } else {
         console.log("[Facebook Broadcast] Successfully posted, ID:", fbData.id);
       }
     } catch(e) {
       console.error("[Facebook Broadcast] Failed:", e);
     }
  }
}
"""

if "async function broadcastToSocialMedia" not in content:
    # insert before function broadcastOfficialRates
    content = content.replace("async function broadcastOfficialRates", helper_func + "\nasync function broadcastOfficialRates")

# Replace Telegram sending with broadcastToSocialMedia
# Pattern for Telegram sending block
pattern_telegram_official = re.compile(r'try \{\s*await telegramManager.sendMessage\(appConfig\.telegramPostChannel, message\);\s*\} catch \(e\) \{\s*console\.error\("\[Telegram Broadcast\] Failed to send official rates:", e\);\s*\}')
content = pattern_telegram_official.sub('await broadcastToSocialMedia(message, isTest);', content)

pattern_telegram_sudden = re.compile(r'try \{\s*await telegramManager.sendMessage\(appConfig\.telegramPostChannel, message\);\s*\} catch \(e\) \{\s*console\.error\("\[Telegram Broadcast\] Failed to send sudden change alert:", e\);\s*\}')
content = pattern_telegram_sudden.sub('await broadcastToSocialMedia(message, false);', content)

pattern_telegram_daily = re.compile(r'try \{\s*await telegramManager.sendMessage\(appConfig\.telegramPostChannel, message\);\s*\} catch \(e\) \{\s*console\.error\("\[Telegram Broadcast\] Failed to send daily report:", e\);\s*\}')
content = pattern_telegram_daily.sub('await broadcastToSocialMedia(message, false);', content)

pattern_telegram_weekly = re.compile(r'try \{\s*await telegramManager.sendMessage\(appConfig\.telegramPostChannel, message\);\s*\} catch \(e\) \{\s*console\.error\("\[Telegram Broadcast\] Failed to send weekly report:", e\);\s*\}')
content = pattern_telegram_weekly.sub('await broadcastToSocialMedia(message, false);', content)

pattern_telegram_changes = re.compile(r'try \{\s*const success = await telegramManager.sendMessage\(appConfig\.telegramPostChannel, message\);\s*if \(\!success\) console\.error\("\[Telegram Broadcast\] Failed to send message"\);\s*\} catch \(e\) \{\s*console\.error\("\[Telegram Broadcast\] Failed to send message:", e\);\s*\}')
content = pattern_telegram_changes.sub('await broadcastToSocialMedia(message, isTest);', content)

# Check if there is still `telegramManager.sendMessage` outside our new helper
with open('server.ts', 'w', encoding='utf-8') as f:
    f.write(content)
