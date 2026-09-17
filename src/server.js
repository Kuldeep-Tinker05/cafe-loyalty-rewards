// Cafe Loyalty Rewards - Express REST API + static frontend.
const express = require("express");
const cors = require("cors");
const path = require("path");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const db = require("./db");
const loyalty = require("./loyalty");

const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "public")));

// ---- helpers ---------------------------------------------------------------
function sign(staff) {
  return jwt.sign({ id: staff.id, name: staff.name, email: staff.email }, JWT_SECRET, {
    expiresIn: "12h",
  });
}

function auth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Missing token" });
  try {
    req.staff = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

function refreshTier(member) {
  const tier = loyalty.tierForPoints(member.lifetime_points);
  if (tier !== member.tier) {
    db.prepare("UPDATE members SET tier = ? WHERE id = ?").run(tier, member.id);
    member.tier = tier;
  }
  return member;
}

// ---- health ----------------------------------------------------------------
app.get("/api/health", (req, res) => res.json({ ok: true }));

// ---- auth ------------------------------------------------------------------
// Register staff
app.post("/api/auth/register", (req, res) => {
  const { name, email, password } = req.body || {};
  if (!name || !email || !password)
    return res.status(400).json({ error: "name, email and password are required" });
  const exists = db.prepare("SELECT id FROM staff WHERE email = ?").get(email);
  if (exists) return res.status(409).json({ error: "Email already registered" });

  const hash = bcrypt.hashSync(password, 10);
  const info = db
    .prepare("INSERT INTO staff (name, email, password_hash) VALUES (?, ?, ?)")
    .run(name, email, hash);
  const staff = { id: info.lastInsertRowid, name, email };
  res.status(201).json({ token: sign(staff), staff });
});

// Login staff
app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password)
    return res.status(400).json({ error: "email and password are required" });
  const staff = db.prepare("SELECT * FROM staff WHERE email = ?").get(email);
  if (!staff || !bcrypt.compareSync(password, staff.password_hash))
    return res.status(401).json({ error: "Invalid credentials" });
  res.json({
    token: sign(staff),
    staff: { id: staff.id, name: staff.name, email: staff.email },
  });
});

// ---- members ---------------------------------------------------------------
// List with search + sort + pagination
app.get("/api/members", auth, (req, res) => {
  const search = (req.query.search || "").trim();
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
  const offset = (page - 1) * limit;

  const sortable = ["name", "phone", "tier", "lifetime_points", "balance_points", "created_at"];
  const sort = sortable.includes(req.query.sort) ? req.query.sort : "created_at";
  const order = (req.query.order || "desc").toLowerCase() === "asc" ? "ASC" : "DESC";

  const where = search ? "WHERE name LIKE @q OR phone LIKE @q OR email LIKE @q" : "";
  const q = `%${search}%`;

  const total = db
    .prepare(`SELECT COUNT(*) AS n FROM members ${where}`)
    .get({ q }).n;
  const rows = db
    .prepare(
      `SELECT * FROM members ${where} ORDER BY ${sort} ${order} LIMIT @limit OFFSET @offset`
    )
    .all({ q, limit, offset });

  res.json({ data: rows, page, limit, total, pages: Math.ceil(total / limit) });
});

// Look up a single member by phone (primary counter workflow)
app.get("/api/members/by-phone/:phone", auth, (req, res) => {
  const member = db.prepare("SELECT * FROM members WHERE phone = ?").get(req.params.phone);
  if (!member) return res.status(404).json({ error: "Member not found" });
  res.json(member);
});

// Get member + transaction history
app.get("/api/members/:id", auth, (req, res) => {
  const member = db.prepare("SELECT * FROM members WHERE id = ?").get(req.params.id);
  if (!member) return res.status(404).json({ error: "Member not found" });
  const transactions = db
    .prepare("SELECT * FROM transactions WHERE member_id = ? ORDER BY created_at DESC")
    .all(member.id);
  res.json({ ...member, transactions });
});

// Create member
app.post("/api/members", auth, (req, res) => {
  const { name, phone, email } = req.body || {};
  if (!name || !phone) return res.status(400).json({ error: "name and phone are required" });
  const exists = db.prepare("SELECT id FROM members WHERE phone = ?").get(phone);
  if (exists) return res.status(409).json({ error: "Phone already registered" });
  const info = db
    .prepare("INSERT INTO members (name, phone, email) VALUES (?, ?, ?)")
    .run(name, phone, email || null);
  res.status(201).json(db.prepare("SELECT * FROM members WHERE id = ?").get(info.lastInsertRowid));
});

// Update member
app.put("/api/members/:id", auth, (req, res) => {
  const member = db.prepare("SELECT * FROM members WHERE id = ?").get(req.params.id);
  if (!member) return res.status(404).json({ error: "Member not found" });
  const { name, phone, email } = req.body || {};
  db.prepare("UPDATE members SET name = ?, phone = ?, email = ? WHERE id = ?").run(
    name ?? member.name,
    phone ?? member.phone,
    email ?? member.email,
    member.id
  );
  res.json(db.prepare("SELECT * FROM members WHERE id = ?").get(member.id));
});

// Delete member
app.delete("/api/members/:id", auth, (req, res) => {
  const info = db.prepare("DELETE FROM members WHERE id = ?").run(req.params.id);
  if (!info.changes) return res.status(404).json({ error: "Member not found" });
  res.json({ ok: true });
});

// ---- purchases & redemptions ----------------------------------------------
// Record a purchase -> auto-award points -> auto-upgrade tier
app.post("/api/members/:id/purchase", auth, (req, res) => {
  const member = db.prepare("SELECT * FROM members WHERE id = ?").get(req.params.id);
  if (!member) return res.status(404).json({ error: "Member not found" });
  const amount = Number(req.body?.amount);
  if (!(amount > 0)) return res.status(400).json({ error: "amount must be a positive number" });

  const earned = loyalty.pointsForPurchase(amount);
  const tx = db.transaction(() => {
    db.prepare(
      "UPDATE members SET lifetime_points = lifetime_points + ?, balance_points = balance_points + ? WHERE id = ?"
    ).run(earned, earned, member.id);
    db.prepare(
      "INSERT INTO transactions (member_id, type, amount, points_delta, note) VALUES (?, 'purchase', ?, ?, ?)"
    ).run(member.id, amount, earned, req.body?.note || null);
  });
  tx();

  const updated = refreshTier(db.prepare("SELECT * FROM members WHERE id = ?").get(member.id));
  res.status(201).json({ pointsEarned: earned, member: updated });
});

// Redeem points -> converts to rupee discount, decrements balance only
app.post("/api/members/:id/redeem", auth, (req, res) => {
  const member = db.prepare("SELECT * FROM members WHERE id = ?").get(req.params.id);
  if (!member) return res.status(404).json({ error: "Member not found" });
  const points = parseInt(req.body?.points);
  const value = loyalty.redeemValue(points);
  if (value === null)
    return res
      .status(400)
      .json({ error: `points must be a positive multiple of ${loyalty.POINTS_PER_REDEEM_UNIT}` });
  if (points > member.balance_points)
    return res.status(400).json({ error: "Insufficient point balance" });

  const tx = db.transaction(() => {
    db.prepare("UPDATE members SET balance_points = balance_points - ? WHERE id = ?").run(
      points,
      member.id
    );
    db.prepare(
      "INSERT INTO transactions (member_id, type, amount, points_delta, note) VALUES (?, 'redeem', ?, ?, ?)"
    ).run(member.id, value, -points, req.body?.note || null);
  });
  tx();

  const updated = db.prepare("SELECT * FROM members WHERE id = ?").get(member.id);
  res.status(201).json({ pointsRedeemed: points, discountValue: value, member: updated });
});

// ---- fallback to landing page ----------------------------------------------
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "public", "index.html"));
});

app.listen(PORT, () => console.log(`Cafe Loyalty API running on http://localhost:${PORT}`));
