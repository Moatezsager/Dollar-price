const fs = require('fs');
let code = fs.readFileSync('src/Admin.tsx', 'utf8');

code = code.replace(/Object\.entries\(analyticsData\.deviceTypes\)\.sort\(\(a, b\) => b\[1\] - a\[1\]\)\.map\(\(\[device, count\]\)/g, 
"Object.entries(analyticsData.deviceTypes).sort((a:any, b:any) => b[1] - a[1]).map(([device, count]: any)");

code = code.replace(/Object\.entries\(analyticsData\.browsers\)\.sort\(\(a, b\) => b\[1\] - a\[1\]\)\.slice\(0, 5\)\.map\(\(\[browser, count\]\)/g, 
"Object.entries(analyticsData.browsers).sort((a:any, b:any) => b[1] - a[1]).slice(0, 5).map(([browser, count]: any)");

code = code.replace(/Object\.entries\(analyticsData\.os\)\.sort\(\(a, b\) => b\[1\] - a\[1\]\)\.slice\(0, 5\)\.map\(\(\[os, count\]\)/g, 
"Object.entries(analyticsData.os).sort((a:any, b:any) => b[1] - a[1]).slice(0, 5).map(([os, count]: any)");

fs.writeFileSync('src/Admin.tsx', code, 'utf8');
console.log("Fixed TS arithmetic issues in Admin.tsx.");
