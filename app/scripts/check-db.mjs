import { Database } from "bun:sqlite";

const db = new Database("./data/db.sqlite");

console.log("\n=== Recent Entries ===");
const entries = db
  .query(
    "SELECT type, name, user_id, timestamp FROM entries ORDER BY created_at DESC LIMIT 10"
  )
  .all();
console.log(entries);

console.log("\n=== Entry Count by Type ===");
const counts = db
  .query(
    "SELECT type, COUNT(*) as count FROM entries WHERE deleted_at IS NULL GROUP BY type"
  )
  .all();
console.log(counts);

console.log("\n=== Users ===");
const users = db.query("SELECT id, username FROM users").all();
console.log(users);

db.close();
