const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const targetStr = `  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }`;

const replacementStr = `  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath, { index: false }));
    app.get("*", (req, res) => {
      let html = fs.readFileSync(path.join(distPath, "index.html"), 'utf8');
      
      // Dynamic SEO Injection
      if (rates && rates.parallel && rates.parallel.USD) {
        const usdStr = rates.parallel.USD.toFixed(2);
        const eurStr = (rates.parallel.EUR || 0).toFixed(2);
        
        const dynamicTitle = \`💵 دولار: \${usdStr} | 💶 يورو: \${eurStr} | مؤشر الدينار\`;
        const dynamicDesc = \`السعر الآن في السوق الموازي: الدولار \${usdStr} د.ل، واليورو \${eurStr} د.ل. تابع أسعار العملات والذهب لحظة بلحظة.\`;
        
        html = html.replace(/<title>.*?<\\/title>/, \`<title>\${dynamicTitle}</title>\`);
        html = html.replace(/<meta name="description" content=".*?" \\/>/, \`<meta name="description" content="\${dynamicDesc}" />\`);
        html = html.replace(/<meta property="og:title" content=".*?" \\/>/, \`<meta property="og:title" content="\${dynamicTitle}" />\`);
        html = html.replace(/<meta property="og:description" content=".*?" \\/>/, \`<meta property="og:description" content="\${dynamicDesc}" />\`);
        html = html.replace(/<meta property="twitter:title" content=".*?" \\/>/, \`<meta property="twitter:title" content="\${dynamicTitle}" />\`);
        html = html.replace(/<meta property="twitter:description" content=".*?" \\/>/, \`<meta property="twitter:description" content="\${dynamicDesc}" />\`);
      }
      
      res.send(html);
    });
  }`;

if (code.includes(targetStr)) {
    code = code.replace(targetStr, replacementStr);
    fs.writeFileSync('server.ts', code, 'utf8');
    console.log("Successfully patched SEO.");
} else {
    console.log("Target string not found for SEO.");
}
