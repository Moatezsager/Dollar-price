const fs = require('fs');

let content = fs.readFileSync('src/index.css', 'utf8');

const currentPattern = `    url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0L33 27L60 30L33 33L30 60L27 33L0 30L27 27Z' fill='%23ffffff' fill-opacity='0.02' fill-rule='evenodd'/%3E%3Cpath d='M15 15L30 0L45 15L60 30L45 45L30 60L15 45L0 30Z' fill='none' stroke='%23ffffff' stroke-opacity='0.015' stroke-width='1'/%3E%3C/svg%3E");`;

// An elegant, authentic-looking Islamic star pattern based on 8-point stars (like the reference image)
const elegantPattern = `    url("data:image/svg+xml,%3Csvg width='120' height='120' viewBox='0 0 120 120' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M60 0L71.4 34.2L102.4 17.6L85.8 48.6L120 60L85.8 71.4L102.4 102.4L71.4 85.8L60 120L48.6 85.8L17.6 102.4L34.2 71.4L0 60L34.2 48.6L17.6 17.6L48.6 34.2Z' fill='none' stroke='%2334d399' stroke-opacity='0.025' stroke-width='1'/%3E%3Cpath d='M60 15L68.5 27L82.5 22.5L78 36.5L90 45L76.5 49.5L81 60L67.5 55.5L60 67.5L52.5 55.5L39 60L43.5 49.5L30 45L42 36.5L37.5 22.5L51.5 27Z' fill='none' stroke='%2310b981' stroke-opacity='0.015' stroke-width='0.5'/%3E%3C/svg%3E");`;

content = content.replace(currentPattern, elegantPattern);
fs.writeFileSync('src/index.css', content);
console.log('Elegant background CSS patched successfully!');
