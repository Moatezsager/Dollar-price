import fs from 'fs';

// Fix server.ts
let code = fs.readFileSync('server.ts', 'utf8');
code = code.replace(/scheduled:\s*true,?\n?\s*/g, "");
code = code.replace(/broadcastRatesUpdate\(\)/g, "broadcastRatesUpdate(rates)");
code = code.replace(/res\.json\(\{ windowMs: limiter\.windowMs, max: limiter\.max \}\)/g, "res.json({ windowMs: (limiter as any).windowMs, max: (limiter as any).max })");
fs.writeFileSync('server.ts', code);

// Fix push.service.ts
let pushCode = fs.readFileSync('server/services/push.service.ts', 'utf8');
pushCode = pushCode.replace(/scheduled:\s*true,?\n?\s*/g, "");
fs.writeFileSync('server/services/push.service.ts', pushCode);

