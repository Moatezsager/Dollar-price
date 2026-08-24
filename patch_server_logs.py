import re

with open('server.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Update DeviceLogEntry interface
old_interface = """interface DeviceLogEntry {
  id: string;
  ip: string;
  userAgent: string;
  timestamp: string;
  deviceType: string;
  deviceName: string;
}"""

new_interface = """interface DeviceLogEntry {
  id: string;
  ip: string;
  userAgent: string;
  timestamp: string;
  deviceType: string;
  deviceName: string;
  visits?: number;
  firstVisit?: string;
}"""

content = content.replace(old_interface, new_interface)

# Update connection logic
old_logic = """      const newLog: DeviceLogEntry = {
        id: Math.random().toString(36).substring(2, 11),
        ip: ip,
        userAgent: ua,
        timestamp: new Date().toISOString(),
        deviceType: deviceType,
        deviceName: deviceName
      };

      userLogs.unshift(newLog);
      if (userLogs.length > 200) userLogs.pop();
      broadcastUserLogs();"""

new_logic = """      const existingLogIndex = userLogs.findIndex(log => log.ip === ip && log.userAgent === ua);
      
      if (existingLogIndex !== -1) {
        const existingLog = userLogs[existingLogIndex];
        existingLog.timestamp = new Date().toISOString();
        existingLog.visits = (existingLog.visits || 1) + 1;
        userLogs.splice(existingLogIndex, 1);
        userLogs.unshift(existingLog);
      } else {
        const newLog: DeviceLogEntry = {
          id: Math.random().toString(36).substring(2, 11),
          ip: ip,
          userAgent: ua,
          timestamp: new Date().toISOString(),
          firstVisit: new Date().toISOString(),
          visits: 1,
          deviceType: deviceType,
          deviceName: deviceName
        };
        userLogs.unshift(newLog);
      }
      
      if (userLogs.length > 200) userLogs.pop();
      broadcastUserLogs();"""

content = content.replace(old_logic, new_logic)

with open('server.ts', 'w', encoding='utf-8') as f:
    f.write(content)
print("Patched server.ts")
