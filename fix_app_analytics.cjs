const fs = require('fs');
let c = fs.readFileSync('src/App.tsx', 'utf8');

const regex = /fetch\('\/api\/analytics\/track', \{\s*method: 'POST',\s*headers: \{ 'Content-Type': 'application\/json' \},\s*body: JSON\.stringify\(\{\s*sessionId,\s*pagePath: window\.location\.pathname,\s*referrer: document\.referrer\s*\}\)\s*\}\)\.catch\(e => console\.log\('Analytics tracking issue:', e\)\);/m;

const replacement = `let visitorClientId = localStorage.getItem('__visitorClientId');
    if (!visitorClientId) {
      visitorClientId = Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
      localStorage.setItem('__visitorClientId', visitorClientId);
    }
    
    fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        visitorClientId,
        pagePath: window.location.pathname,
        referrer: document.referrer
      })
    }).catch(e => console.log('Analytics tracking issue:', e));`;

c = c.replace(regex, replacement);

fs.writeFileSync('src/App.tsx', c);
