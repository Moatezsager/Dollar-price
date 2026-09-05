const fs = require('fs');
let app = fs.readFileSync('src/App.tsx', 'utf8');

if (!app.includes('import About from "./components/About";')) {
  app = app.replace(
    'import Contact from "./components/Contact";',
    'import Contact from "./components/Contact";\nimport About from "./components/About";'
  );
  
  if (!app.includes('import About from "./components/About";')) {
    // If exact match failed, let's just inject it at the top
    app = 'import About from "./components/About";\n' + app;
  }
}

fs.writeFileSync('src/App.tsx', app, 'utf8');
console.log('Fixed import!');
