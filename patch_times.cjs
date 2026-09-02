const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// Replace startup block
code = code.replace(
  "if (currentLibyaHour >= 0 && currentLibyaHour < 6) {",
  "if (currentLibyaHour >= 1 && currentLibyaHour < 9) {"
);

// Replace auto-refresh block (just in case they are exactly the same or different)
// Actually the replace above only does the first instance. Let's use a regex with global flag.
code = code.replace(/if \(currentLibyaHour >= 0 && currentLibyaHour < 6\) \{/g, "if (currentLibyaHour >= 1 && currentLibyaHour < 9) {");

fs.writeFileSync('server.ts', code, 'utf8');
console.log("Successfully updated quiet hours.");
