# ☕ BrewPoints — Cafe Loyalty Rewards System

A full-stack loyalty tool for cafe counter staff. Staff log in, look up members by phone,
record purchases (points are awarded automatically), watch Bronze/Silver/Gold tiers upgrade,
and let members redeem points for discounts.

Built for the **AurigaIT Round 2 "Builder" Challenge**.

## Tech Stack
- **Backend:** Node.js + Express (REST API)
- **Database:** SQLite (via `better-sqlite3`) — zero-config, file-based
- **Auth:** JWT + bcrypt password hashing
- **Frontend:** Vanilla HTML/CSS/JS (single-page staff app + landing page), served by Express

## Quick Start
```bash
npm install
npm run seed      # creates demo staff + sample members
npm start         # http://localhost:4000
```
- Landing page: `http://localhost:4000/`
- Staff app: `http://localhost:4000/app.html`
- **Demo login:** `staff@cafe.com` / `password123`

## Loyalty Rules (single source of truth: `src/loyalty.js`)
| Rule | Value |
|------|-------|
| Earning | 1 point per ₹10 spent (rounded down) |
| Redemption | 100 points = ₹10 discount |
| Bronze | lifetime points < 500 |
| Silver | 500 – 1999 |
| Gold | ≥ 2000 |

`lifetime_points` drives the tier and never decreases. `balance_points` is spendable and
decreases on redemption. Tiers auto-upgrade after each purchase.

## Database Schema
- **staff** — `id, name, email (unique), password_hash, created_at`
- **members** — `id, name, phone (unique), email, tier, lifetime_points, balance_points, created_at`
- **transactions** — `id, member_id (FK), type ('purchase'|'redeem'), amount, points_delta, note, created_at`

## REST API

### Auth
| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | `{name, email, password}` | Register staff, returns JWT |
| POST | `/api/auth/login` | `{email, password}` | Login, returns JWT |

### Members (all require `Authorization: Bearer <token>`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/members?search=&sort=&order=&page=&limit=` | List with **search + sort + pagination** |
| GET | `/api/members/by-phone/:phone` | Fast phone lookup (counter workflow) |
| GET | `/api/members/:id` | Member details + transaction history |
| POST | `/api/members` | Create member `{name, phone, email?}` |
| PUT | `/api/members/:id` | Update member |
| DELETE | `/api/members/:id` | Delete member |

### Purchases & Redemptions
| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| POST | `/api/members/:id/purchase` | `{amount, note?}` | Records purchase, auto-awards points, auto-upgrades tier |
| POST | `/api/members/:id/redeem` | `{points, note?}` | Redeems points for discount, decrements balance |

### Query parameters for `GET /api/members`
- `search` — matches name, phone, or email
- `sort` — `name`, `phone`, `tier`, `lifetime_points`, `balance_points`, `created_at`
- `order` — `asc` | `desc`
- `page`, `limit` — pagination (default page 1, limit 10)

## Example
```bash
# login
curl -X POST localhost:4000/api/auth/login -H "Content-Type: application/json" \
  -d '{"email":"staff@cafe.com","password":"password123"}'

# record a purchase (use token from above)
curl -X POST localhost:4000/api/members/1/purchase -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" -d '{"amount":450}'
```

## Project Structure
```
cafe-loyalty-rewards/
├── src/
│   ├── server.js     # Express app + all routes
│   ├── db.js         # SQLite connection + schema
│   ├── loyalty.js    # points & tier rules (single source of truth)
│   └── seed.js       # demo data
├── public/           # landing page + staff SPA
│   ├── index.html    # one-page landing
│   ├── app.html      # staff app
│   ├── app.js        # frontend logic
│   └── styles.css
└── package.json
```

## Environment
Copy `.env.example` to `.env` to override `PORT` and `JWT_SECRET`.
