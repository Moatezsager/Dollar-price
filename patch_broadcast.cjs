const fs = require('fs');
let server = fs.readFileSync('server.ts', 'utf8');

const targetTg = `const shouldPostTg = (!isTest && appConfig.telegramAutoPost) || (isTest && (target === 'telegram' || target === 'all'));`;
const replaceTg = `const shouldPostTg = (target === 'telegram' || target === 'all') && ((!isTest && appConfig.telegramAutoPost) || isTest);`;

const targetFb = `const shouldPostFb = (!isTest && appConfig.facebookAutoPost) || (isTest && (target === 'facebook' || target === 'all'));`;
const replaceFb = `const shouldPostFb = (target === 'facebook' || target === 'all') && ((!isTest && appConfig.facebookAutoPost) || isTest);`;

if (server.includes(targetTg) && server.includes(targetFb)) {
  server = server.replace(targetTg, replaceTg);
  server = server.replace(targetFb, replaceFb);
  fs.writeFileSync('server.ts', server, 'utf8');
  console.log('Patched broadcastToSocialMedia');
} else {
  console.log('Targets not found for broadcast');
}
