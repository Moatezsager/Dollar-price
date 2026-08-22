const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const regexToRemove = /\s*\}, payload\);\s*\} catch \(err: any\) \{\s*if \(err\.statusCode === 410 \|\| err\.statusCode === 404\) \{\s*\/\/ Subscription expired or invalid\s*db\.prepare\('DELETE FROM push_subscriptions WHERE endpoint = \?'\)\.run\(sub\.endpoint\);\s*\}\s*\}\s*\}\s*\} catch \(err\) \{\s*console\.error\('\[Push\] Retention error:', err\);\s*\}\s*\}/;

code = code.replace(regexToRemove, '');
fs.writeFileSync('server.ts', code);
console.log('Fixed syntax error');
