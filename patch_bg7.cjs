const fs = require('fs');
let content = fs.readFileSync('src/index.css', 'utf8');

const regex = /background-image:\s*radial-gradient[\s\S]*?background-size: 100% 100%, \d+px \d+px;/;

// A modern, elegant, premium financial background:
// A deep dark slate gradient with a very subtle, soft radial glow (emerald) at the top.
// Clean, minimalist, and perfect for a dashboard.
const newStyle = `background-image: 
    radial-gradient(circle at 50% 0%, rgba(16, 185, 129, 0.08) 0%, transparent 60%),
    radial-gradient(circle at 0% 100%, rgba(59, 130, 246, 0.05) 0%, transparent 50%),
    linear-gradient(to bottom, #020617 0%, #09090b 100%);
  background-attachment: fixed;`;

if (regex.test(content)) {
  content = content.replace(regex, newStyle);
  fs.writeFileSync('src/index.css', content);
  console.log('Background updated to a modern, minimalist financial gradient!');
} else {
  console.log('Regex did not match.');
}
