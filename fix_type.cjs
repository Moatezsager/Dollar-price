const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// Ensure UAParser resolves to right import type
if (code.includes('import UAParser from \'ua-parser-js\';')) {
    code = code.replace("import UAParser from 'ua-parser-js';", "import { UAParser } from 'ua-parser-js';");
    fs.writeFileSync('server.ts', code, 'utf8');
}
