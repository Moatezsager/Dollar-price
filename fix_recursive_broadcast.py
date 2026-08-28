import re

with open('server.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix the recursive call inside broadcastToSocialMedia
bad_code = """        if (appConfig.telegramPostChannel && telegramManager) {
          const success = await broadcastToSocialMedia(message, typeof isTest !== "undefined" ? isTest : false);
          if (!success) console.error("[Telegram Broadcast] Failed to send message");
        }"""
good_code = """        if (appConfig.telegramPostChannel && telegramManager) {
          const success = await telegramManager.sendMessage(appConfig.telegramPostChannel, message);
          if (!success) console.error("[Telegram Broadcast] Failed to send message");
        }"""
content = content.replace(bad_code, good_code)

with open('server.ts', 'w', encoding='utf-8') as f:
    f.write(content)
