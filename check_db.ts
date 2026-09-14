import Database from 'better-sqlite3';
const db = new Database('messages.db');
const states = db.prepare('SELECT * FROM broadcast_state').all();
console.log(states);
