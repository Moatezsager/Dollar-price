const fs = require('fs');
let c = fs.readFileSync('server.ts', 'utf8');

c = c.replace(
  /if \(error\) \{\s*console\.error\("\[Analytics\] Supabase query failed, falling back to local SQLite", error\);\s*\}/,
  `if (error) {
             if (error.code !== '42P01') {
                 console.error("[Analytics] Supabase query failed, falling back to local SQLite:", error.message);
             }
          }`
);

fs.writeFileSync('server.ts', c);
console.log("Fixed analytics logs");
