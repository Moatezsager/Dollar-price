import re

with open('src/Admin.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add facebook settings state inside Admin.tsx
# In React, it's mapped directly inside `config`, so we just read `config.facebookPageId` etc.
# We will append the Facebook Auto Post Settings under the Telegram ones.
pattern = re.compile(r'(<h3 className="text-xl font-bold text-white mb-4">إعدادات النشر التلقائي عبر تيليجرام</h3>\s*<div.*?</div>\s*</div>)', re.DOTALL)

# Let's find exactly the telegram section
# We have `<h3 className="text-xl font-bold text-white mb-4">إعدادات النشر التلقائي عبر تيليجرام</h3>`
# It's inside `<div className="mt-8 space-y-6">`
