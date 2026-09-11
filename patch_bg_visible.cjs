const fs = require('fs');

let content = fs.readFileSync('src/index.css', 'utf8');

// The pattern opacity was too low (0.015). Let's increase it to 0.08 and make the background color explicitly dark blue to match the user's reference image.
// Let's also add background-size to ensure it tiles correctly.

const oldPatternRegex = /background-image:\s*radial-gradient[\s\S]*?;\s*background-attachment:\s*fixed;/;

const newPattern = `background-color: #091121;
  background-image: 
    radial-gradient(circle at 50% 0%, rgba(15, 23, 42, 0.8) 0%, transparent 80%),
    url("data:image/svg+xml,%3Csvg width='120' height='120' viewBox='0 0 120 120' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M60 0L71.4 34.2L102.4 17.6L85.8 48.6L120 60L85.8 71.4L102.4 102.4L71.4 85.8L60 120L48.6 85.8L17.6 102.4L34.2 71.4L0 60L34.2 48.6L17.6 17.6L48.6 34.2Z' fill='none' stroke='%2334d399' stroke-opacity='0.08' stroke-width='1.5'/%3E%3Cpath d='M60 15L68.5 27L82.5 22.5L78 36.5L90 45L76.5 49.5L81 60L67.5 55.5L60 67.5L52.5 55.5L39 60L43.5 49.5L30 45L42 36.5L37.5 22.5L51.5 27Z' fill='none' stroke='%2310b981' stroke-opacity='0.05' stroke-width='1'/%3E%3C/svg%3E");
  background-attachment: fixed;
  background-size: 100% 100%, 120px 120px;`;

content = content.replace(/background-color: #020617; \/\* slate-950 \*\//, '');
content = content.replace(oldPatternRegex, newPattern);

fs.writeFileSync('src/index.css', content);
console.log('Background opacity increased!');
