const fs = require('fs');
let content = fs.readFileSync('src/index.css', 'utf8');

const regex = /background-image:\s*radial-gradient[\s\S]*?background-size: 100% 100%, \d+px \d+px;/;

const newStyle = `background-image: 
    radial-gradient(circle at 50% 0%, rgba(15, 23, 42, 0.85) 0%, transparent 85%),
    url("data:image/svg+xml,%3Csvg width='150' height='150' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' stroke='%2310b981' stroke-width='1' stroke-opacity='0.09'%3E%3Cpath d='M25 25h50v50h-50zM-25-25h50v50h-50zM75-25h50v50h-50zM-25 75h50v50h-50zM75 75h50v50h-50z' /%3E%3Cpath d='M50 14.64L85.36 50 50 85.36 14.64 50zM0-35.36L35.36 0 0 35.36-35.36 0zM100-35.36L135.36 0 100 35.36 64.64 0zM0 64.64L35.36 100 0 135.36-35.36 100zM100 64.64L135.36 100 100 135.36 64.64 100z' /%3E%3Cpath d='M50 32l12.73 5.27L68 50l-5.27 12.73L50 68l-12.73-5.27L32 50l5.27-12.73z' stroke-opacity='0.18' stroke-width='1.5' /%3E%3Cpath d='M0-18l12.73 5.27L18 0 12.73 12.73 0 18l-12.73-5.27L-18 0l5.27-12.73z' stroke-opacity='0.18' stroke-width='1.5' /%3E%3Cpath d='M100-18l12.73 5.27L118 0l-5.27 12.73L100 18l-12.73-5.27L82 0l5.27-12.73z' stroke-opacity='0.18' stroke-width='1.5' /%3E%3Cpath d='M0 82l12.73 5.27L18 100l-5.27 12.73L0 118l-12.73-5.27L-18 100l5.27-12.73z' stroke-opacity='0.18' stroke-width='1.5' /%3E%3Cpath d='M100 82l12.73 5.27L118 100l-5.27 12.73L100 118l-12.73-5.27L82 100l5.27-12.73z' stroke-opacity='0.18' stroke-width='1.5' /%3E%3Cpath d='M50 14.64V0M85.36 50H100M50 85.36V100M14.64 50H0M0 14.64V0M35.36 0H50M100 14.64V0M64.64 0H50M0 85.36V100M35.36 100H50M100 85.36V100M64.64 100H50' /%3E%3C/g%3E%3C/svg%3E");
  background-attachment: fixed;
  background-size: 100% 100%, 150px 150px;`;

if (regex.test(content)) {
  content = content.replace(regex, newStyle);
  fs.writeFileSync('src/index.css', content);
  console.log('Background updated to authentic interconnected Khatam pattern!');
} else {
  console.log('Regex did not match.');
}
