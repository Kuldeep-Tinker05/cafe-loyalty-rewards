// SQLite database setup and schema. Uses better-sqlite3 (synchronous, simple).
const Database = require("better-sqlite3");
const path = require("path");

const db = new Database(path.join(__dirname, "..", "cafe.db"));
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS staff (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT NOT NULL,
    email         TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at     TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS members (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    name            TEXT NOT NULL,
    phone           TEXT NOT NULL UNIQUE,
    email           TEXT,
    tier            TEXT NOT NULL DEFAULT 'Bronze',
    lifetime_points INTEGER NOT NULL DEFAULT 0,  -- drives tier, never decreases
    balance_points  INTEGER NOT NULL DEFAULT 0,  -- spendable, decreases on redeem
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    member_id     INTEGER NOT NULL,
    type          TEXT NOT NULL,             -- 'purchase' | 'redeem'
    amount        REAL NOT NULL DEFAULT 0,   -- money spent (purchase)
    points_delta  INTEGER NOT NULL DEFAULT 0,-- + earned / - redeemed
    note          TEXT,
    created_at    TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
  );
`);

module.exports = db;
