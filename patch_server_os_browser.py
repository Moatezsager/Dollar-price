import re

with open('server.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update interface
old_interface = """interface DeviceLogEntry {
  id: string;
  ip: string;
  userAgent: string;
  timestamp: string;
  deviceType: string;
  deviceName: string;
  visits?: number;
  firstVisit?: string;
}"""

new_interface = """interface DeviceLogEntry {
  id: string;
  ip: string;
  userAgent: string;
  timestamp: string;
  deviceType: string;
  deviceName: string;
  os?: string;
  browser?: string;
  visits?: number;
  firstVisit?: string;
}"""

content = content.replace(old_interface, new_interface)

# 2. Update logging logic
old_logic = """      else if (/Linux/i.test(ua)) deviceName = "Linux PC";
      else deviceName = deviceType;

      const existingLogIndex = userLogs.findIndex(log => log.ip === ip && log.userAgent === ua);"""

new_logic = """      else if (/Linux/i.test(ua)) deviceName = "Linux PC";
      else deviceName = deviceType;

      let os = "Unknown OS";
      if (/Windows/i.test(ua)) os = "Windows";
      else if (/Mac OS X/i.test(ua)) os = "macOS";
      else if (/Android/i.test(ua)) os = "Android";
      else if (/Linux/i.test(ua)) os = "Linux";
      else if (/iPhone|iPad|iPod/i.test(ua)) os = "iOS";
      
      let browser = "Unknown Browser";
      if (/Edg/i.test(ua)) browser = "Edge";
      else if (/Chrome|CriOS/i.test(ua)) browser = "Chrome";
      else if (/Firefox|FxiOS/i.test(ua)) browser = "Firefox";
      else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) browser = "Safari";
      else if (/Opera|OPR/i.test(ua)) browser = "Opera";

      const existingLogIndex = userLogs.findIndex(log => log.ip === ip && log.userAgent === ua);"""

content = content.replace(old_logic, new_logic)

# 3. Update newLog object
old_newlog = """          timestamp: new Date().toISOString(),
          firstVisit: new Date().toISOString(),
          visits: 1,
          deviceType: deviceType,
          deviceName: deviceName
        };"""

new_newlog = """          timestamp: new Date().toISOString(),
          firstVisit: new Date().toISOString(),
          visits: 1,
          deviceType: deviceType,
          deviceName: deviceName,
          os: os,
          browser: browser
        };"""

content = content.replace(old_newlog, new_newlog)

# Also clear the logs array so the new interface is applied immediately
content = content.replace("let userLogs: DeviceLogEntry[] = [];", "let userLogs: DeviceLogEntry[] = [];") # Just restarting server will do it

with open('server.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print("Patched server.ts")
