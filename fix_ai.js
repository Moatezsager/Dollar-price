import fs from 'fs';
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(/\/\*\*[\s\S]*?const aiProcessedTexts = new Set<string>\(\);\n?/g, "");

// Add import
const importStatement = "import { extractRatesWithAI } from './server/services/ai.service';\n";
code = code.replace(/import { getTelegramClient/g, importStatement + "import { getTelegramClient");

fs.writeFileSync('server.ts', code);
