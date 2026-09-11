const Database = require('better-sqlite3');
const db = new Database('messages.db');
const schema = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='messages'").get();
console.log(schema);
