const Database = require('better-sqlite3');
const db = new Database('messages.db');
try {
    const stmt = db.prepare('INSERT INTO messages (email, phone, message) VALUES (?, ?, ?)');
    stmt.run("test@test.com", "123", "test");
    console.log("Insert successful!");
} catch (e) {
    console.error("Error:", e);
}
