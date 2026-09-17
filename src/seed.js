// Seed script: creates a demo staff login and sample members with history.
const bcrypt = require("bcryptjs");
const db = require("./db");
const loyalty = require("./loyalty");

console.log("Seeding database...");

db.exec("DELETE FROM transactions; DELETE FROM members; DELETE FROM staff;");

// Demo staff account
const hash = bcrypt.hashSync("password123", 10);
db.prepare("INSERT INTO staff (name, email, password_hash) VALUES (?, ?, ?)").run(
  "Demo Barista",
  "staff@cafe.com",
  hash
);

const sample = [
  { name: "Aarav Sharma", phone: "9800000001", email: "aarav@example.com", spend: [250, 480, 1200] },
  { name: "Diya Patel", phone: "9800000002", email: "diya@example.com", spend: [90, 60] },
  { name: "Kabir Singh", phone: "9800000003", email: "kabir@example.com", spend: [5000, 8000, 9000] },
  { name: "Meera Nair", phone: "9800000004", email: "meera@example.com", spend: [300, 300, 300, 300] },
  { name: "Rohan Gupta", phone: "9800000005", email: null, spend: [45] },
];

const insertMember = db.prepare(
  "INSERT INTO members (name, phone, email, tier, lifetime_points, balance_points) VALUES (?, ?, ?, ?, ?, ?)"
);
const insertTx = db.prepare(
  "INSERT INTO transactions (member_id, type, amount, points_delta) VALUES (?, 'purchase', ?, ?)"
);
const insertLot = db.prepare(
  "INSERT INTO point_lots (member_id, source_transaction_id, points_earned, points_remaining, earned_at, expires_at) VALUES (?, ?, ?, ?, ?, ?)"
);

for (const m of sample) {
  let lifetime = 0;
  const earned = [];
  for (const amt of m.spend) {
    const tier = loyalty.tierForPoints(lifetime);
    const points = loyalty.pointsForPurchase(amt, tier);
    lifetime += points;
    earned.push(points);
  }
  const tier = loyalty.tierForPoints(lifetime);
  const info = insertMember.run(m.name, m.phone, m.email, tier, lifetime, lifetime);
  m.spend.forEach((amt, index) => {
    const purchase = insertTx.run(info.lastInsertRowid, amt, earned[index]);
    const earnedAt = new Date().toISOString();
    insertLot.run(
      info.lastInsertRowid,
      purchase.lastInsertRowid,
      earned[index],
      earned[index],
      earnedAt,
      new Date(new Date(earnedAt).getTime() + 90 * 24 * 60 * 60 * 1000).toISOString()
    );
  });
}

console.log("Done. Login with staff@cafe.com / password123");
db.close();
