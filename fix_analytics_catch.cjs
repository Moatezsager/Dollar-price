const fs = require('fs');
let c = fs.readFileSync('server.ts', 'utf8');

c = c.replace(
  /\}\]\)\.catch\(e => console\.error\("Supabase Visitor Log sync failed:", e\.message\)\);/g,
  "}]).then(({error}) => { if (error) console.error('Supabase Visitor Log sync failed:', error.message); });"
);

fs.writeFileSync('server.ts', c);
console.log("Fixed catch");
