const fs = require('fs');

let content = fs.readFileSync('src/index.css', 'utf8');

// We'll create a subtle repeating geometric pattern using a data URI SVG that matches the dark blue theme
const backgroundCSS = `
body {
  font-family: "Inter", "Cairo", sans-serif;
  background-color: #020617; /* slate-950 */
  /* Add subtle Islamic geometric pattern overlay */
  background-image: 
    radial-gradient(circle at 50% 0%, rgba(15, 23, 42, 0.8) 0%, transparent 80%),
    url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0L33 27L60 30L33 33L30 60L27 33L0 30L27 27Z' fill='%23ffffff' fill-opacity='0.02' fill-rule='evenodd'/%3E%3Cpath d='M15 15L30 0L45 15L60 30L45 45L30 60L15 45L0 30Z' fill='none' stroke='%23ffffff' stroke-opacity='0.015' stroke-width='1'/%3E%3C/svg%3E");
  background-attachment: fixed;
  color: #ffffff;
`;

content = content.replace(/body\s*{\s*font-family:\s*"Inter",\s*"Cairo",\s*sans-serif;\s*background-color:\s*#020617;\s*\/\*\s*slate-950\s*\*\/\s*background-image:\s*radial-gradient\(circle at 50% 0%, #0f172a 0%, transparent 70%\);\s*background-attachment:\s*fixed;\s*color:\s*#ffffff;/g, backgroundCSS);

fs.writeFileSync('src/index.css', content);
console.log('Background CSS patched!');
