const fs = require('fs');
let code = fs.readFileSync('src/Admin.tsx', 'utf8');

if (!code.includes(', LineChart, Radio ')) {
    code = code.replace("} from 'lucide-react';", ", LineChart, Radio } from 'lucide-react';");
    fs.writeFileSync('src/Admin.tsx', code, 'utf8');
}
