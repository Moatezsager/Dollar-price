const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const targetStr = `  useEffect(() => {
    const handleOnline = () => setIsOffline(false);`;
    
const trackerStr = `  // Analytics Tracker
  useEffect(() => {
    const sessionId = sessionStorage.getItem('__sessionId') || (Math.random().toString(36).substring(2) + Date.now().toString(36));
    sessionStorage.setItem('__sessionId', sessionId);
    
    fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        pagePath: window.location.pathname,
        referrer: document.referrer
      })
    }).catch(e => console.log('Analytics tracking issue:', e));
  }, []);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);`;

if (code.includes(targetStr)) {
    code = code.replace(targetStr, trackerStr);
    fs.writeFileSync('src/App.tsx', code, 'utf8');
    console.log("Patched App.tsx with analytics tracker.");
} else {
    console.log("Could not patch App.tsx tracker or already patched.");
}
