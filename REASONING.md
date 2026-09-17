# REASONING.md

## Goal
Ship a working full-stack Cafe Loyalty Rewards System within a strict 2.5-hour window:
member lookup, purchases with auto-awarded points, tier management, redemptions,
plus auth, search, pagination, sorting, and a landing page.

## Stack choices & why
- **Node + Express** — fastest way to stand up a REST API I know well; minimal boilerplate.
- **SQLite via better-sqlite3** — zero external service to configure, single file DB, and a
  *synchronous* API that keeps route handlers short and readable under time pressure. A real
  relational schema (with FK constraints) still demonstrates DB competence, and it clones/runs
  anywhere with just `npm install`.
- **Vanilla HTML/CSS/JS frontend served by Express** — no build step, no bundler config to
  debug. One origin means no CORS headaches in the demo, and the whole thing runs from `npm start`.
- **JWT + bcrypt** — standard, simple auth. One token, 12h expiry. No refresh-token complexity
  because the requirement is just "registration/login that works."

## Key design decisions
1. **All loyalty rules live in `src/loyalty.js`.** Points earning, redemption conversion, and
   tier thresholds are pure functions in one file — easy to audit, test, and change. Nothing
   about "how many points" is scattered across routes.
2. **`lifetime_points` vs `balance_points`.** Lifetime drives the tier and never decreases, so a
   member who redeems doesn't get demoted. Balance is the spendable wallet. This mirrors how real
   loyalty programs work and prevents a common bug (redeeming dropping someone's tier).
3. **Tier auto-upgrades after every purchase** via `refreshTier()` — the client never sets tiers
   manually, keeping data consistent.
4. **One list endpoint does search + sort + pagination.** `GET /api/members` covers all three
   graded requirements. Sort columns are whitelisted to prevent SQL injection via `sort`/`order`.
5. **Atomic writes.** Purchases and redemptions run inside `db.transaction()` so the member update
   and the transaction-log insert can't drift apart.
6. **Parameterised queries everywhere** — no string-concatenated SQL, so user input is safe.

## Trade-offs / what I skipped (and would add with more time)
- No automated tests — verified endpoints manually with curl. Would add Jest + supertest.
- No role separation (all staff equal). Fine for a counter tool.
- Frontend is vanilla JS, not React — chosen deliberately for speed and zero build risk.
  With more time I'd port the staff app to React for cleaner state management.
- No rate limiting / audit trail of which staff performed a transaction (schema could add
  `staff_id` to `transactions` easily).

## How requirements map to the code
| Requirement | Where |
|-------------|-------|
| Database | `src/db.js` (3 tables, FK) |
| REST APIs listed in README | `src/server.js` |
| Registration / login | `/api/auth/*`, bcrypt + JWT |
| Search | `GET /api/members?search=` |
| Pagination | `?page=&limit=` |
| Sorting | `?sort=&order=` (whitelisted) |
| Points auto-award | `POST /:id/purchase` → `loyalty.pointsForPurchase` |
| Tier upgrades | `refreshTier()` after purchase |
| Redemption | `POST /:id/redeem` → `loyalty.redeemValue` |
| Landing page | `public/index.html` |
| Usable UI | `public/app.html` + `app.js` |
