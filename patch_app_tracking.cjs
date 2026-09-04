const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const targetEffect = `  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {`;
    
const trackerStr = `  // Analytics Tracker
  useEffect(() => {
    const sessionId = sessionStorage.getItem('__sessionId') || (Math.random().toString(36).substring(2) + Date.now().toString(36));
    sessionStorage.setItem('__sessionId', sessionId);
    
    // Only track once per session load, or on major route changes if it was a multi-page app.
    fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        pagePath: window.location.pathname,
        referrer: document.referrer
      })
    }).catch(console.error);
  }, []);

  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {`;

if (code.includes(targetEffect) && !code.includes('/api/analytics/track')) {
    code = code.replace(targetEffect, trackerStr);
    fs.writeFileSync('src/App.tsx', code, 'utf8');
    console.log("Patched App.tsx with analytics tracker.");
} else {
    console.log("Could not patch App.tsx tracker or already patched.");
}
