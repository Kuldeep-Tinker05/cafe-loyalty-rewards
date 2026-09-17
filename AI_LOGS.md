# AI_LOGS.md

> This file must contain the **unmodified** log of your AI conversations for the challenge.
> Below is the log from the planning + scaffolding session. **Keep appending every further
> AI conversation you have while building — do not edit or trim past entries.**

---

## Session 1 — Planning

**Me:** [Assigned problem: build a Cafe Loyalty Rewards System — counter-staff app to look up
members by phone, record purchases (auto-awarding points), manage Bronze/Silver/Gold tiers,
allow redemptions. Must be full-stack with a database, REST APIs listed in README, usable UI,
registration/login, search, pagination, sorting, and a one-page landing page. Repo must include
README.md, REASONING.md, AI_LOGS.md within a 2.5-hour window. Asked the AI for a battle plan.]

**AI:** Provided a full plan — recommended stack (Node + Express + SQLite + React/plain HTML),
database schema, points/tier logic, complete list of API endpoints, a 2.5-hour timeline, and
UI flow.

---

## Session 2 — Review of the plan

**Me:** "ok again check and tell me is this complete and good solution and if not tell me how
to build this fast under the time range and best."

**AI:** Confirmed the plan is solid and win-worthy. Flagged the real risk is *time*, not
architecture. Key advice:
- Start AI_LOGS.md now and paste every conversation as you go (graders check authenticity).
- Keep auth dumb: single staff table + bcrypt + one JWT.
- Bake search + pagination + sorting into one members endpoint.
- Keep all points/tier logic in one service function.
- Landing page in ~20 min.
Gave a minute-by-minute build order: backend APIs first (that's what's graded), then UI, then
landing page, then the three docs, then final push. Recommended separating `lifetime_points`
(drives tier) from `balance_points` (spendable).

---

## Session 3 — Code generation

**Me:** "ok generate me and provide me a downloadable file."

**AI:** Generated the complete project and packaged it as a downloadable zip:
- `src/db.js` — SQLite schema (staff, members, transactions)
- `src/loyalty.js` — points & tier rules (single source of truth)
- `src/server.js` — Express REST API (auth, members CRUD, search/sort/paginate, purchase, redeem)
- `src/seed.js` — demo staff + sample members
- `public/index.html` — landing page
- `public/app.html`, `public/app.js`, `public/styles.css` — staff SPA
- `README.md`, `REASONING.md`, `AI_LOGS.md`, `.gitignore`, `.env.example`, `package.json`

---

<!-- APPEND FURTHER AI CONVERSATIONS BELOW THIS LINE -->
