import re

with open('src/Admin.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

old_isonline = """const isOnline = new Date().getTime() - new Date(log.timestamp).getTime() < 3 * 60 * 1000;"""
new_isonline = """const isOnline = log.isOnline || (new Date().getTime() - new Date(log.timestamp).getTime() < 1 * 60 * 1000);"""

content = content.replace(old_isonline, new_isonline)

with open('src/Admin.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Patched Admin.tsx")
