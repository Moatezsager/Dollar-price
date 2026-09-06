const fs = require('fs');
let server = fs.readFileSync('server.ts', 'utf8');

const target = `     try {
       const targetId = appConfig.facebookPageId.trim() || 'me';
       let url = \`https://graph.facebook.com/v20.0/\${targetId}/feed\`;
       let fbRes = await fetch(url, {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ message: fbMessage, access_token: appConfig.facebookAccessToken })
       });`;

const replacement = `     try {
       const targetId = appConfig.facebookPageId.trim() || 'me';
       let url = \`https://graph.facebook.com/v20.0/\${targetId}/feed\`;
       
       // Extract link for Facebook rich preview
       let linkToAttach = null;
       const urlMatch = fbMessage.match(/https?:\\/\\/[^\\s]+/);
       if (urlMatch) {
         linkToAttach = urlMatch[0];
       }
       
       const payload: any = { message: fbMessage, access_token: appConfig.facebookAccessToken };
       if (linkToAttach) {
         payload.link = linkToAttach;
       }

       let fbRes = await fetch(url, {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify(payload)
       });`;

if (server.includes(target)) {
  server = server.replace(target, replacement);
  fs.writeFileSync('server.ts', server, 'utf8');
  console.log('Patched Facebook broadcast link preview');
} else {
  console.log('Target not found for Facebook link patch');
}
