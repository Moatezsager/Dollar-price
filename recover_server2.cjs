const fs = require('fs');
const mapData = JSON.parse(fs.readFileSync('dist/server.cjs.map', 'utf8'));

const sourceIndex = mapData.sources.indexOf('../server.ts');
if (sourceIndex !== -1) {
  const originalCode = mapData.sourcesContent[sourceIndex];
  fs.writeFileSync('server.ts', originalCode);
  console.log('Successfully recovered server.ts');
} else {
  console.log('server.ts not found in source map');
}
