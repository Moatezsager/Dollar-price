const fs = require('fs');

let content = fs.readFileSync('server.ts', 'utf8');

const oldLogic = `      const stmt = db.prepare('INSERT INTO messages (email, phone, message) VALUES (?, ?, ?)');
      stmt.run(email, phone, message);
      
      res.json({ success: true, message: "تم إرسال رسالتك بنجاح. سيتم الرد عليك في أقل من 24 ساعة." });`;

const newLogic = `      const stmt = db.prepare('INSERT INTO messages (email, phone, message) VALUES (?, ?, ?)');
      stmt.run(email, phone, message);
      
      // التزامن مع قاعدة البيانات السحابية (Supabase)
      if (supabase) {
        supabase.from('visitor_messages').insert([{
          email,
          phone,
          message,
          status: 'new'
        }]).catch(e => console.error("Supabase Visitor Message sync failed:", e.message));
      }
      
      res.json({ success: true, message: "تم إرسال رسالتك بنجاح. سيتم الرد عليك في أقل من 24 ساعة." });`;

content = content.replace(oldLogic, newLogic);
fs.writeFileSync('server.ts', content);
console.log('Messages logic updated!');
