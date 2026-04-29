const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

console.log("Testing better-sqlite3 load...");
try {
    const db = new Database(':memory:');
    console.log("SUCCESS: Database loaded in memory.");
    db.close();
} catch (e) {
    console.error("FAILURE: Could not load better-sqlite3:", e.message);
    process.exit(1);
}
