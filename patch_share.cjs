const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(/url: window\.location\.origin/g, "url: 'https://dollar-price-qp14.onrender.com/'");
code = code.replace(/navigator\.clipboard\.writeText\(window\.location\.origin\)/g, "navigator.clipboard.writeText('https://dollar-price-qp14.onrender.com/')");

fs.writeFileSync('src/App.tsx', code, 'utf8');
console.log("Patched App.tsx share buttons.");
