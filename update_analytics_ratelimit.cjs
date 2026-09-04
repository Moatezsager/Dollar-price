const fs = require('fs');

let serverTs = fs.readFileSync('server.ts', 'utf8');

const targetStr = `  // Analytics Tracking Endpoint
  app.post("/api/analytics/track", (req: express.Request, res: express.Response) => {`;

const replaceStr = `  // Analytics Tracking Endpoint
  const analyticsRateLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 30, // limit each IP to 30 tracking requests per minute
    message: { success: false, message: "Too many tracking requests, please try again later." },
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.post("/api/analytics/track", analyticsRateLimiter, (req: express.Request, res: express.Response) => {`;

if (serverTs.includes(targetStr)) {
  serverTs = serverTs.replace(targetStr, replaceStr);
  fs.writeFileSync('server.ts', serverTs, 'utf8');
  console.log('Rate limiter added to /api/analytics/track');
} else {
  console.log('Target string not found');
}
