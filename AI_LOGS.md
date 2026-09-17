# AI_LOGS.md

> This file contains the log of AI conversations for the challenge.

---

## Session 1 — Planning
Me: Assigned problem — build a Cafe Loyalty Rewards System (member lookup by phone, purchases auto-awarding points, Bronze/Silver/Gold tiers, redemptions). Must be full-stack with DB, REST APIs in README, UI, login, search, pagination, sorting, landing page. Repo needs README.md, REASONING.md, AI_LOGS.md in 2.5 hours. Asked for a battle plan.
AI: Gave full plan — stack (Node + Express + SQLite), schema, points/tier logic, API endpoints, timeline, UI flow.

## Session 2 — Review of the plan
Me: "check and tell me is this complete and good, if not how to build fast and best."
AI: Confirmed plan is solid; real risk is time. Advised: start AI_LOGS.md now, keep auth simple (staff table + bcrypt + JWT), one members endpoint for search+pagination+sorting, all points/tier logic in one function, separate lifetime_points from balance_points. Gave build order: backend first, then UI, landing page, docs, push.

## Session 3 — Code generation
Me: "generate me and provide a downloadable file."
AI: Generated the full project: src/db.js, src/loyalty.js, src/server.js, src/seed.js, public/index.html, public/app.html, public/app.js, public/styles.css, README.md, REASONING.md, AI_LOGS.md, .gitignore, .env.example, package.json.

## Session 4 — Verification & packaging
Me: "it's not downloading, give me a zip link."
AI: Ran npm install, seeded DB, started server, smoke-tested endpoints (login, members list, purchase awarded 45 pts on ₹450, redeem 100 pts → ₹10 off, tier preserved). All passed. Packaged as a zip; recommended GitHub.

## Session 5 — Getting code onto GitHub
Me: "how to download to my laptop" / "how to find terminal."
AI: Recommended pushing to GitHub. Walked through creating a public repo, confirming settings (README/.gitignore/license OFF), and generating a Personal Access Token with repo scope.

## Session 6 — Commit & push
Me: Provided repo URL and a token.
AI: Ran git init, committed, set main branch + remote, pushed successfully. Advised revoking the token immediately.

## Session 7 — Token cleanup & wrap-up
Me: "I deleted the token."
AI: Confirmed revocation; code stayed safe on GitHub. Reviewed final submission checklist.
