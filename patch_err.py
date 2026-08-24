import re

with open('server.ts', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    'res.status(500).json({ success: false, error: "Internal server error during official refresh" });',
    'res.status(500).json({ success: false, error: "Internal server error during official refresh", details: err ? String(err) : "Unknown", stack: err && err.stack ? err.stack : "" });'
)

with open('server.ts', 'w', encoding='utf-8') as f:
    f.write(content)
