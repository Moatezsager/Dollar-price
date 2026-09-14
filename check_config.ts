import Database from 'better-sqlite3';
const db = new Database('messages.db');
const stored = db.prepare('SELECT value FROM server_config WHERE key = ?').get('app_config') as any;
console.log(stored.value);
