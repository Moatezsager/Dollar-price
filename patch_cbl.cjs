const fs = require('fs');
let server = fs.readFileSync('server.ts', 'utf8');

// 1. Modify fetchFromCBL signature
server = server.replace(
  'async function fetchFromCBL(): Promise<RateMap | null> {',
  'async function fetchFromCBL(): Promise<{ cblDate: string, rates: RateMap } | null> {'
);

// 2. Extract cblDate
const rowParseTarget = `      if (tds && tds.length >= 6) {
        const currencyHtml = tds[1];
        let currencyId = null;`;

const rowParseReplacement = `      if (tds && tds.length >= 6) {
        const dateHtml = tds[0];
        const dateMatch = dateHtml.match(/\\d{4}-\\d{2}-\\d{2}/);
        if (dateMatch && !cblDateStr) {
          cblDateStr = dateMatch[0];
        }
        
        const currencyHtml = tds[1];
        let currencyId = null;`;

server = server.replace(
  'const results: RateMap = {};',
  'const results: RateMap = {};\n    let cblDateStr = "";'
);

server = server.replace(rowParseTarget, rowParseReplacement);

// 3. Modify fetchFromCBL return
server = server.replace(
  'return Object.keys(results).length > 0 ? results : null;',
  'return Object.keys(results).length > 0 ? { cblDate: cblDateStr, rates: results } : null;'
);

fs.writeFileSync('server.ts', server, 'utf8');
console.log('fetchFromCBL patched');
