const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  /<Developers key="api" onBack=\{\(\) => setCurrentPage\('dashboard'\)\} \/>/g,
  '<motion.div key="api" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}><Developers onBack={() => setCurrentPage(\'dashboard\')} /></motion.div>'
);

code = code.replace(
  /<Terms key="terms" onBack=\{\(\) => setCurrentPage\('dashboard'\)\} \/>/g,
  '<motion.div key="terms" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}><Terms onBack={() => setCurrentPage(\'dashboard\')} /></motion.div>'
);

code = code.replace(
  /<Privacy key="privacy" onBack=\{\(\) => setCurrentPage\('dashboard'\)\} \/>/g,
  '<motion.div key="privacy" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}><Privacy onBack={() => setCurrentPage(\'dashboard\')} /></motion.div>'
);

code = code.replace(
  /<Contact key="contact" onBack=\{\(\) => setCurrentPage\('dashboard'\)\} \/>/g,
  '<motion.div key="contact" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}><Contact onBack={() => setCurrentPage(\'dashboard\')} /></motion.div>'
);

fs.writeFileSync('src/App.tsx', code, 'utf8');
console.log("Fixed App.tsx keys.");
