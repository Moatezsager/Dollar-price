const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const targetStr = `            telegramUpdates.push({
              id: term.id,
              name: term.name,
              oldVal: currentVal || newValFromTelegram,
              newVal: newValFromTelegram,
              flag: term.flag
            });`;
const newStr = `            telegramUpdates.push({
              id: term.id,
              name: term.name,
              oldVal: currentVal || newValFromTelegram,
              newVal: newValFromTelegram,
              flag: term.flag
            });
            
            updateStats(term.id, newValFromTelegram);
            broadcastSuddenChangeAlert({
              id: term.id,
              name: term.name,
              oldVal: currentVal || newValFromTelegram,
              newVal: newValFromTelegram,
              flag: term.flag
            });`;
            
if (code.includes(targetStr) && !code.includes('updateStats(term.id, newValFromTelegram);')) {
  code = code.replace(targetStr, newStr);
  fs.writeFileSync('server.ts', code);
  console.log('patched updateStats in loop');
} else {
  console.log('could not find target or already patched');
}
