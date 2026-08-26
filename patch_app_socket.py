import re

with open('src/App.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

old_socket = """    const connect = () => {
      try {
        socket = io();"""

new_socket = """    const connect = () => {
      try {
        let deviceId = localStorage.getItem('__deviceId');
        if (!deviceId) {
          deviceId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
          localStorage.setItem('__deviceId', deviceId);
        }
        socket = io('/', { query: { deviceId } });"""

if "query: { deviceId }" not in content:
    content = content.replace(old_socket, new_socket)
    with open('src/App.tsx', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Patched App.tsx")
else:
    print("Already patched App.tsx")
