// SQLite database setup and schema. Uses better-sqlite3 (synchronous, simple).
const Database = require("better-sqlite3");
const path = require("path");

const db = new Database(path.join(__dirname, "..", "cafe.db"));
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

function normalizeTimestamp(value) {
  const normalized = value.includes("T") ? value : `${value.replace(" ", "T")}Z`;
  const timestamp = new Date(normalized);
  return Number.isNaN(timestamp.getTime()) ? value : timestamp.toISOString();
}

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

  CREATE TABLE IF NOT EXISTS point_lots (
    id                   INTEGER PRIMARY KEY AUTOINCREMENT,
    member_id            INTEGER NOT NULL,
    source_transaction_id INTEGER,
    points_earned        INTEGER NOT NULL,
    points_remaining     INTEGER NOT NULL,
    earned_at            TEXT NOT NULL,
    expires_at           TEXT NOT NULL,
    FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
    FOREIGN KEY (source_transaction_id) REFERENCES transactions(id)
  );

  CREATE INDEX IF NOT EXISTS idx_point_lots_expiration
    ON point_lots (expires_at, points_remaining);

  CREATE INDEX IF NOT EXISTS idx_point_lots_member
    ON point_lots (member_id, earned_at);

  CREATE TABLE IF NOT EXISTS outbox (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    event_type   TEXT NOT NULL,
    member_id    INTEGER NOT NULL,
    payload      TEXT NOT NULL,
    created_at   TEXT NOT NULL DEFAULT (datetime('now')),
    delivered_at TEXT,
    FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_outbox_pending
    ON outbox (delivered_at, created_at);
`);

const migrateExistingData = db.transaction(() => {
  db.prepare(
    "UPDATE members SET tier = 'Platinum' WHERE lifetime_points >= 5000 AND tier <> 'Platinum'"
  ).run();

  db.prepare(`
    INSERT INTO point_lots (
      member_id,
      points_earned,
      points_remaining,
      earned_at,
      expires_at
    )
    SELECT
      m.id,
      m.balance_points,
      m.balance_points,
      datetime('now'),
      datetime('now', '+90 days')
    FROM members AS m
    WHERE m.balance_points > 0
      AND NOT EXISTS (
        SELECT 1 FROM point_lots AS p WHERE p.member_id = m.id
      )
  `).run();

  const legacyLots = db
    .prepare("SELECT id, earned_at, expires_at FROM point_lots")
    .all();
  const updateLotTimestamp = db.prepare(
    "UPDATE point_lots SET earned_at = ?, expires_at = ? WHERE id = ?"
  );
  for (const lot of legacyLots) {
    updateLotTimestamp.run(
      normalizeTimestamp(lot.earned_at),
      normalizeTimestamp(lot.expires_at),
      lot.id
    );
  }
});

migrateExistingData();

module.exports = db;
