const fs = require('fs');
let c = fs.readFileSync('server.ts', 'utf8');

const oldAuthRegex = /let adminToken = Math\.random\(\)[\s\S]*?res\.status\(401\)\.json\({ success: false, message: "غير مصرح" }\);\s*\}\s*\};\n/m;

const newAuthCode = `  const adminTokens = new Map<string, number>();
  const ADMIN_SESSION_DURATION = 24 * 60 * 60 * 1000;

  const requireAdmin = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const expiry = adminTokens.get(token);
      if (expiry && expiry > Date.now()) {
        return next();
      } else if (expiry) {
        adminTokens.delete(token);
      }
    }
    res.status(401).json({ success: false, message: "غير مصرح" });
  };\n`;

c = c.replace(oldAuthRegex, newAuthCode);

const oldLoginRegex = /app\.post\("\/api\/admin\/login", \(req: express\.Request, res: express\.Response\) => \{\s*const \{ password \} = req\.body;\s*if \(password === effectiveAdminPassword\) \{\s*res\.json\(\{ success: true, token: adminToken \}\);\s*\} else \{\s*res\.status\(401\)\.json\(\{ success: false, message: "كلمة المرور غير صحيحة" \}\);\s*\}\s*\}\);/m;

const newLoginCode = `  const adminLoginRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: { success: false, message: "لقد تجاوزت الحد المسموح به لمحاولات تسجيل الدخول. يرجى المحاولة بعد 15 دقيقة." }
  });

  app.post("/api/admin/login", adminLoginRateLimiter, (req: express.Request, res: express.Response) => {
    const { password } = req.body;
    
    const expected = effectiveAdminPassword || "";
    const provided = password || "";
    
    const expectedHash = crypto.createHash('sha256').update(expected).digest();
    const providedHash = crypto.createHash('sha256').update(provided).digest();
    
    if (expected && crypto.timingSafeEqual(expectedHash, providedHash)) {
      const token = crypto.randomBytes(32).toString('hex');
      adminTokens.set(token, Date.now() + ADMIN_SESSION_DURATION);
      
      for (const [t, exp] of adminTokens.entries()) {
        if (exp < Date.now()) adminTokens.delete(t);
      }
      
      res.json({ success: true, token: token });
    } else {
      res.status(401).json({ success: false, message: "كلمة المرور غير صحيحة" });
    }
  });`;

c = c.replace(oldLoginRegex, newLoginCode);

fs.writeFileSync('server.ts', c);
console.log("Done modifying server.ts");
