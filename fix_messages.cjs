const fs = require('fs');

let content = fs.readFileSync('server.ts', 'utf8');

const oldLogic = `      if (supabase) {
        supabase.from('visitor_messages').insert([{
          email,
          phone,
          message,
          status: 'new'
        }]).catch(e => console.error("Supabase Visitor Message sync failed:", e.message));
      }`;

const newLogic = `      if (supabase) {
        supabase.from('visitor_messages').insert([{
          email,
          phone,
          message,
          status: 'new'
        }]).then(({error}) => {
          if (error) console.error("Supabase Visitor Message sync failed:", error.message);
        });
      }`;

content = content.replace(oldLogic, newLogic);
fs.writeFileSync('server.ts', content);
console.log('Fixed supabase insert logic');
