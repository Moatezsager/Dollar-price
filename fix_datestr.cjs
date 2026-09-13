const fs = require('fs');
let c = fs.readFileSync('server.ts', 'utf8');

c = c.replace(
  "const dateStr = e.created_at.split(' ')[0] || e.created_at.split('T')[0];",
  "const dateStr = new Date(e.created_at).toISOString().split('T')[0];"
);

fs.writeFileSync('server.ts', c);
console.log("Done fixing dateStr");
