import re

with open('server.ts', 'r', encoding='utf-8') as f:
    content = f.read()

old_ip = """    const ip = (req.headers['x-forwarded-for'] || req.connection.remoteAddress) as string;"""
new_ip = """    const rawIp = (req.headers['x-forwarded-for'] || req.connection.remoteAddress || '') as string;
    const ip = rawIp.split(',')[0].trim();"""

content = content.replace(old_ip, new_ip)

# Also let's clear existing logs so it looks clean for the user
old_clear = """let userLogs: DeviceLogEntry[] = [];"""
new_clear = """let userLogs: DeviceLogEntry[] = [];""" # We will just restart the server to clear it.

with open('server.ts', 'w', encoding='utf-8') as f:
    f.write(content)
print("Patched server.ts")
