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
1. **All loyalty rules live in `src/loyalty.js`.** Platinum is a fourth tier for members with
  lifetime points of 5000 or more. Tier-specific earning rates are Bronze: 1 point per ₹10,
  Silver: 1.5 points per ₹10, Gold: 2 points per ₹10, and Platinum: 0.3 points per ₹1, with
  final points rounded down. Redemption conversion and tier thresholds are also pure functions in one file —
  easy to audit, test, and change. Nothing about "how many points" is scattered across routes.
2. **Purchases use the pre-purchase tier.** The route reads the member's current tier before
  updating lifetime points, so a purchase that crosses a threshold uses the old tier's rate.
  The tier refresh happens only after the purchase is recorded, making the next purchase use
  the upgraded rate.
3. **`lifetime_points` vs `balance_points`.** Lifetime points drive the tier and never decrease.
  Balance points are the spendable wallet and decrease on redemption. This means redeeming
  points does not demote a member.
4. **Point lots support expiration.** Aggregate balances cannot identify which points are still
  unused or when they expire, so each purchase creates a `point_lots` row with remaining points
  and a 90-day expiration. Redemption consumes lots FIFO, making partial consumption deterministic.
  Expiration reduces only `balance_points`; lifetime points represent earned history and never decrease.
5. **The explicit `/clock` timestamp keeps expiration deterministic.** `POST /clock` accepts an ISO
  timestamp instead of changing the process or system clock, which makes grading and focused tests repeatable.
6. **Tier notifications use an outbox.** A tier-change event is inserted into the outbox in the
  same purchase transaction, so the purchase and notification cannot diverge. `GET /outbox` exposes
  pending events in creation order without marking them delivered.
7. **Tier auto-upgrades after every purchase** in the purchase transaction — the client never sets
  tiers manually, keeping data consistent.
8. **One list endpoint does search + sort + pagination.** `GET /api/members` covers all three
   graded requirements. Sort columns are whitelisted to prevent SQL injection via `sort`/`order`.
9. **Atomic writes and redemption protection.** Purchases and redemptions run inside
  `db.transaction()` so the member update and transaction-log insert cannot drift apart.
  Redemption re-reads the current balance inside the transaction and throws on insufficient
  balance, so no partial redemption can commit.
10. **Parameterised queries everywhere** — no string-concatenated SQL, so user input is safe.

## Trade-offs / what I skipped (and would add with more time)
- No full automated test suite — validation used JavaScript syntax checks, focused assertions for
  tier rates, strict purchase/redemption inputs, pagination guards, tier sorting, redemption
  rollback, lifetime-point preservation, landing-page content, and a safe seed run in a temporary
  project copy. Additional focused temporary-server checks covered point-lot creation, FIFO and
  partial redemption, exact 90-day expiry, `/clock` idempotence, Platinum crossings, outbox event
  ordering, repeatable reads, and transaction rollback. A full Jest + supertest suite would still be useful.
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
| Tier upgrades | Purchase transaction recalculates the tier |
| Redemption | `POST /:id/redeem` → `loyalty.redeemValue` |
| Point expiration | `point_lots` + `POST /clock` |
| Tier notifications | `outbox` + `GET /outbox` |
| Landing page | `public/index.html` |
| Usable UI | `public/app.html` + `app.js` |
