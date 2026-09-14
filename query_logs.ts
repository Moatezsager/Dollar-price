import Database from 'better-sqlite3';
const db = new Database('messages.db');
const logs = db.prepare("SELECT * FROM messages ORDER BY id DESC LIMIT 10").all();
console.log(logs);
