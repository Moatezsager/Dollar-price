const fs = require('fs');
let app = fs.readFileSync('src/App.tsx', 'utf8');

app = app.replace(
  "onClick={() => setActiveTab('terms')}",
  "onClick={() => { window.scrollTo(0,0); setCurrentPage('terms'); }}"
);
app = app.replace(
  "onClick={() => setActiveTab('privacy')}",
  "onClick={() => { window.scrollTo(0,0); setCurrentPage('privacy'); }}"
);
app = app.replace(
  "onClick={() => setActiveTab('contact')}",
  "onClick={() => { window.scrollTo(0,0); setCurrentPage('contact'); }}"
);
app = app.replace(
  "onClick={() => setActiveTab('developers')}",
  "onClick={() => { window.scrollTo(0,0); setCurrentPage('api'); }}"
);
app = app.replace(
  ">عن المنصة<",
  ">بوابة المطورين<"
);

fs.writeFileSync('src/App.tsx', app, 'utf8');
console.log('Patched App.tsx simple');
