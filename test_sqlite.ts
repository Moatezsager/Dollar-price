import Database from 'better-sqlite3';
const db = new Database(':memory:');
db.exec('CREATE TABLE test (id TEXT PRIMARY KEY, val INTEGER)');
const stmt = db.prepare('INSERT INTO test (id, val) VALUES (?, ?)');
db.transaction(() => {
  stmt.run('a', 1);
  stmt.run('b', 2);
})();
console.log(db.prepare('SELECT * FROM test').all());
