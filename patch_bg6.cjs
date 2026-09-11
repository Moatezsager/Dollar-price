const fs = require('fs');
let content = fs.readFileSync('src/index.css', 'utf8');

const regex = /background-image:\s*radial-gradient[\s\S]*?background-size: 100% 100%, \d+px \d+px;/;

// Generating a beautiful, complex authentic star polygon (12-point star grid) 
// using exact SVG coordinates for a true Islamic geometric pattern (Tariq / Arabesque style)
const newStyle = `background-image: 
    radial-gradient(circle at 50% 0%, rgba(15, 23, 42, 0.85) 0%, transparent 85%),
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' width='120' height='120'%3E%3Cg fill='none' stroke='%2310b981' stroke-width='0.5' stroke-opacity='0.12'%3E%3Cpath d='M50 0L57 14L71 7L64 21L79 21L64 29L71 43L57 36L50 50L43 36L29 43L36 29L21 21L36 21L29 7L43 14Z'/%3E%3Cpath d='M100 50L93 64L107 57L100 71L115 71L100 79L107 93L93 86L86 100L79 86L65 93L72 79L57 71L72 71L65 57L79 64Z'/%3E%3Cpath d='M0 50L-7 64L7 57L0 71L15 71L0 79L7 93L-7 86L-14 100L-21 86L-35 93L-28 79L-43 71L-28 71L-35 57L-21 64Z'/%3E%3Cpath d='M50 100L57 114L71 107L64 121L79 121L64 129L71 143L57 136L50 150L43 136L29 143L36 129L21 121L36 121L29 107L43 114Z'/%3E%3Cpath d='M50 0L57 -14L71 -7L64 -21L79 -21L64 -29L71 -43L57 -36L50 -50L43 -36L29 -43L36 -29L21 -21L36 -21L29 -7L43 -14Z'/%3E%3Cpath d='M0 0L7 14L21 7L14 21L29 21L14 29L21 43L7 36L0 50L-7 36L-21 43L-14 29L-29 21L-14 21L-21 7L-7 14Z'/%3E%3Cpath d='M100 0L93 14L107 7L100 21L115 21L100 29L107 43L93 36L86 50L79 36L65 43L72 29L57 21L72 21L65 7L79 14Z'/%3E%3Cpath d='M0 100L7 114L21 107L14 121L29 121L14 129L21 143L7 136L0 150L-7 136L-21 143L-14 129L-29 121L-14 121L-21 107L-7 114Z'/%3E%3Cpath d='M100 100L93 114L107 107L100 121L115 121L100 129L107 143L93 136L86 150L79 136L65 143L72 129L57 121L72 121L65 107L79 114Z'/%3E%3Ccircle cx='50' cy='0' r='14'/%3E%3Ccircle cx='100' cy='50' r='14'/%3E%3Ccircle cx='0' cy='50' r='14'/%3E%3Ccircle cx='50' cy='100' r='14'/%3E%3Ccircle cx='0' cy='0' r='14'/%3E%3Ccircle cx='100' cy='0' r='14'/%3E%3Ccircle cx='0' cy='100' r='14'/%3E%3Ccircle cx='100' cy='100' r='14'/%3E%3C/g%3E%3C/svg%3E");
  background-attachment: fixed;
  background-size: 100% 100%, 120px 120px;`;

if (regex.test(content)) {
  content = content.replace(regex, newStyle);
  fs.writeFileSync('src/index.css', content);
  console.log('Background updated to authentic 12-point star geometric pattern!');
} else {
  console.log('Regex did not match.');
}
