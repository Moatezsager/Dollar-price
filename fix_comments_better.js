import fs from 'fs';
let code = fs.readFileSync('server.ts', 'utf8');

// Replace all `\n * ` that don't have `/**\n` before them... actually just find where there's an error.
// We can just regex replace `\n \* ` with `\n/**\n * ` if it's not preceded by `/**`.

// Or maybe I can just delete all lines starting with ` * ` and ` */` to be safe, since they are just comments.
// It's much easier to just regex out the comments completely.

let lines = code.split('\n');
let out = [];
for (let line of lines) {
    let t = line.trim();
    if (t.startsWith('* ') || t === '*/' || t === '/**') {
        continue; // drop it
    }
    out.push(line);
}
fs.writeFileSync('server.ts', out.join('\n'));
