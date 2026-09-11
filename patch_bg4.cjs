const fs = require('fs');
let content = fs.readFileSync('src/index.css', 'utf8');
const regex = /radial-gradient\(circle at 50% 0%, rgba\(15, 23, 42, 0\.8\) 0%, transparent 80%\),[\s\S]*?background-size: 100% 100%, 120px 120px;/;
const newStyle = `radial-gradient(circle at 50% 0%, rgba(15, 23, 42, 0.8) 0%, transparent 80%),
    url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' stroke='%2334d399' stroke-width='0.8' stroke-opacity='0.04'%3E%3Cpath d='M0 40h80M40 0v80' stroke-opacity='0.02' /%3E%3Cg transform='translate(40, 40)'%3E%3Crect x='-14' y='-14' width='28' height='28' /%3E%3Crect x='-14' y='-14' width='28' height='28' transform='rotate(45)' /%3E%3Ccircle r='5' stroke-opacity='0.02' /%3E%3C/g%3E%3Cg transform='translate(0, 0)'%3E%3Crect x='-14' y='-14' width='28' height='28' /%3E%3Crect x='-14' y='-14' width='28' height='28' transform='rotate(45)' /%3E%3Ccircle r='5' stroke-opacity='0.02' /%3E%3C/g%3E%3Cg transform='translate(80, 0)'%3E%3Crect x='-14' y='-14' width='28' height='28' /%3E%3Crect x='-14' y='-14' width='28' height='28' transform='rotate(45)' /%3E%3Ccircle r='5' stroke-opacity='0.02' /%3E%3C/g%3E%3Cg transform='translate(0, 80)'%3E%3Crect x='-14' y='-14' width='28' height='28' /%3E%3Crect x='-14' y='-14' width='28' height='28' transform='rotate(45)' /%3E%3Ccircle r='5' stroke-opacity='0.02' /%3E%3C/g%3E%3Cg transform='translate(80, 80)'%3E%3Crect x='-14' y='-14' width='28' height='28' /%3E%3Crect x='-14' y='-14' width='28' height='28' transform='rotate(45)' /%3E%3Ccircle r='5' stroke-opacity='0.02' /%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
  background-attachment: fixed;
  background-size: 100% 100%, 100px 100px;`;
content = content.replace(regex, newStyle);
fs.writeFileSync('src/index.css', content);
console.log('Background updated to elegant Rub el Hizb geometric grid!');
