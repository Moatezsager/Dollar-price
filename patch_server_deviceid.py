import re

with open('server.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update Interface
old_interface = """interface DeviceLogEntry {
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

new_interface = """interface DeviceLogEntry {
  id: string;
  deviceId: string;
  ip: string;
  userAgent: string;
  timestamp: string;
  deviceType: string;
  deviceName: string;
  os?: string;
  browser?: string;
  visits?: number;
  firstVisit?: string;
  isOnline?: boolean;
}"""

content = content.replace(old_interface, new_interface)

# 2. Add connected devices tracker
old_tracker = """let onlineUsers = 0;"""
new_tracker = """let onlineUsers = 0;
  const connectedDevices = new Map<string, Set<string>>(); // deviceId -> socketIds
  const updateDeviceOnlineStatus = (deviceId: string) => {
    const isOnline = (connectedDevices.get(deviceId)?.size || 0) > 0;
    const log = userLogs.find(l => l.deviceId === deviceId);
    if (log) {
        log.isOnline = isOnline;
        if (isOnline) {
             log.timestamp = new Date().toISOString();
        }
        broadcastUserLogs();
    }
  };"""

content = content.replace(old_tracker, new_tracker)

# 3. Handle connection logic
old_logic = """    onlineUsers++;

    const rawIp = (req.headers['x-forwarded-for'] || req.connection.remoteAddress || '') as string;
    const ip = rawIp.split(',')[0].trim();
    const ua = req.headers['user-agent'] || 'Unknown';

    // Exclude specific IPs from being logged
    const EXCLUDED_IPS: string[] = []; // Removed '41.254.79.142' so you can see yourself during testing
    const shouldLog = !EXCLUDED_IPS.some(excludedIp => ip && ip.includes(excludedIp));

    if (shouldLog) {
      let deviceType = "Desktop";
      let deviceName = "Unknown Device";
      if (/mobile/i.test(ua)) deviceType = "Mobile";
      if (/tablet/i.test(ua)) deviceType = "Tablet";
      if (/bot|crawler|spider/i.test(ua)) deviceType = "Bot";
      // Detect specific names
      if (/iPhone/i.test(ua)) deviceName = "iPhone";
      else if (/iPad/i.test(ua)) deviceName = "iPad";
      else if (/Samsung|SM-|GT-/i.test(ua)) deviceName = "Samsung";
      else if (/Android/i.test(ua)) deviceName = "Android";
      else if (/Windows/i.test(ua)) deviceName = "Windows PC";
      else if (/Macintosh/i.test(ua)) deviceName = "MacBook/iMac";
      else if (/Linux/i.test(ua)) deviceName = "Linux PC";
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

      const existingLogIndex = userLogs.findIndex(log => log.ip === ip && log.userAgent === ua);
      
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
          deviceName: deviceName,
          os: os,
          browser: browser
        };
        userLogs.unshift(newLog);
      }
      
      if (userLogs.length > 200) userLogs.pop();
      broadcastUserLogs();
    }

    broadcastOnlineCount();

    socket.on('disconnect', () => {
      onlineUsers = Math.max(0, onlineUsers - 1);
      broadcastOnlineCount();
    });"""

new_logic = """    onlineUsers++;

    const rawIp = (req.headers['x-forwarded-for'] || req.connection.remoteAddress || '') as string;
    const ip = rawIp.split(',')[0].trim();
    const ua = req.headers['user-agent'] || 'Unknown';
    const deviceId = (socket.handshake.query.deviceId as string) || ip + '-' + ua;

    if (!connectedDevices.has(deviceId)) {
        connectedDevices.set(deviceId, new Set());
    }
    connectedDevices.get(deviceId)!.add(socket.id);

    // Exclude specific IPs from being logged
    const EXCLUDED_IPS: string[] = []; 
    const shouldLog = !EXCLUDED_IPS.some(excludedIp => ip && ip.includes(excludedIp));

    if (shouldLog) {
      let deviceType = "Desktop";
      let deviceName = "Unknown Device";
      if (/mobile/i.test(ua)) deviceType = "Mobile";
      if (/tablet/i.test(ua)) deviceType = "Tablet";
      if (/bot|crawler|spider/i.test(ua)) deviceType = "Bot";
      if (/iPhone/i.test(ua)) deviceName = "iPhone";
      else if (/iPad/i.test(ua)) deviceName = "iPad";
      else if (/Samsung|SM-|GT-/i.test(ua)) deviceName = "Samsung";
      else if (/Android/i.test(ua)) deviceName = "Android";
      else if (/Windows/i.test(ua)) deviceName = "Windows PC";
      else if (/Macintosh/i.test(ua)) deviceName = "MacBook/iMac";
      else if (/Linux/i.test(ua)) deviceName = "Linux PC";
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

      const existingLogIndex = userLogs.findIndex(log => log.deviceId === deviceId);
      
      if (existingLogIndex !== -1) {
        const existingLog = userLogs[existingLogIndex];
        existingLog.timestamp = new Date().toISOString();
        existingLog.ip = ip; // Update IP in case it changed
        // Only increment visits if this is the first socket connection for this device in this session
        if (connectedDevices.get(deviceId)!.size === 1) {
            existingLog.visits = (existingLog.visits || 1) + 1;
        }
        existingLog.isOnline = true;
        userLogs.splice(existingLogIndex, 1);
        userLogs.unshift(existingLog);
      } else {
        const newLog: DeviceLogEntry = {
          id: Math.random().toString(36).substring(2, 11),
          deviceId: deviceId,
          ip: ip,
          userAgent: ua,
          timestamp: new Date().toISOString(),
          firstVisit: new Date().toISOString(),
          visits: 1,
          deviceType: deviceType,
          deviceName: deviceName,
          os: os,
          browser: browser,
          isOnline: true
        };
        userLogs.unshift(newLog);
      }
      
      if (userLogs.length > 200) userLogs.pop();
      broadcastUserLogs();
    }

    broadcastOnlineCount();

    socket.on('disconnect', () => {
      onlineUsers = Math.max(0, onlineUsers - 1);
      broadcastOnlineCount();
      
      if (connectedDevices.has(deviceId)) {
          connectedDevices.get(deviceId)!.delete(socket.id);
          if (connectedDevices.get(deviceId)!.size === 0) {
              connectedDevices.delete(deviceId);
          }
          updateDeviceOnlineStatus(deviceId);
      }
    });"""

content = content.replace(old_logic, new_logic)

with open('server.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print("Patched server.ts")
