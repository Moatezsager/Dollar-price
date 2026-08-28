import re

with open('server.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace telegramManager.sendMessage directly
content = re.sub(r'await telegramManager\.sendMessage\(appConfig\.telegramPostChannel, message\);', 'await broadcastToSocialMedia(message, typeof isTest !== "undefined" ? isTest : false);', content)

with open('server.ts', 'w', encoding='utf-8') as f:
    f.write(content)
