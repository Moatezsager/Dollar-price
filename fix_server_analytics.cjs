const fs = require('fs');
let c = fs.readFileSync('server.ts', 'utf8');

const regex = /const \{ sessionId, pagePath, referrer \} = req\.body;\s*const uaString = req\.headers\['user-agent'\] \|\| '';\s*const ip = \(req\.headers\["x-forwarded-for"\] \|\| req\.socket\.remoteAddress \|\| ""\)\.toString\(\)\.split\(','\)\[0\]\.trim\(\);\s*const parser = new UAParser\(uaString\);\s*const result = parser\.getResult\(\);\s*const visitorId = crypto\.createHash\('sha256'\)\.update\(ip \+ result\.browser\.name \+ result\.os\.name\)\.digest\('hex'\)\.substring\(0, 16\);/m;

const replacement = `const { sessionId, visitorClientId, pagePath, referrer } = req.body;
      const uaString = req.headers['user-agent'] || '';
      const ip = (req.headers["x-forwarded-for"] || req.socket.remoteAddress || "").toString().split(',')[0].trim();
      
      const parser = new UAParser(uaString);
      const result = parser.getResult();
      
      let visitorId = visitorClientId;
      if (!visitorId || typeof visitorId !== 'string') {
        visitorId = crypto.createHash('sha256').update(ip + result.browser.name + result.os.name).digest('hex').substring(0, 16);
      }`;

c = c.replace(regex, replacement);

fs.writeFileSync('server.ts', c);
console.log("Done fixing server tracking");
