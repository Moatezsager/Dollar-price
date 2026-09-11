const fs = require('fs');

let content = fs.readFileSync('src/index.css', 'utf8');

// The first patch didn't replace because the regex might not have matched exactly due to spacing/newlines.
// Let's do a more robust replace.

const target = `body {
  font-family: "Inter", "Cairo", sans-serif;
  background-color: #020617; /* slate-950 */
  background-image: radial-gradient(circle at 50% 0%, #0f172a 0%, transparent 70%);
  background-attachment: fixed;
  color: #ffffff;`;

const replacement = `body {
  font-family: "Inter", "Cairo", sans-serif;
  background-color: #020617; /* slate-950 */
  background-image: 
    radial-gradient(circle at 50% 0%, rgba(15, 23, 42, 0.8) 0%, transparent 80%),
    url("data:image/svg+xml,%3Csvg width='120' height='120' viewBox='0 0 120 120' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.02' fill-rule='evenodd'%3E%3Cpath d='M60 0L67 53L120 60L67 67L60 120L53 67L0 60L53 53Z'/%3E%3Cpath d='M30 30L60 0L90 30L120 60L90 90L60 120L30 90L0 60Z' fill='none' stroke='%23ffffff' stroke-opacity='0.03' stroke-width='1'/%3E%3Cpath d='M15 15L30 30M105 15L90 30M15 105L30 90M105 105L90 90' stroke='%23ffffff' stroke-opacity='0.03' stroke-width='1'/%3E%3C/g%3E%3C/svg%3E");
  background-attachment: fixed;
  background-size: 100% 100%, 120px 120px;
  color: #ffffff;`;

if (content.includes(target)) {
  content = content.replace(target, replacement);
  fs.writeFileSync('src/index.css', content);
  console.log('Background CSS patched successfully!');
} else {
  console.log('Target string not found in index.css');
}
