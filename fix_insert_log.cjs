const fs = require('fs');
let c = fs.readFileSync('server.ts', 'utf8');

c = c.replace(
  /\}\]\)\.then\(\(\{error\}\) => \{ if \(error\) console\.error\('Supabase Visitor Log sync failed:', error\.message\); \}\);/g,
  "}]).then(({error}) => { if (error && error.code !== '42P01') console.error('Supabase Visitor Log sync failed:', error.message); });"
);

fs.writeFileSync('server.ts', c);
console.log("Fixed insert log");
