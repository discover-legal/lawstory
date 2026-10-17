# CLAUDE.md: discover.legal (site-v6 rewrite)

Read `README.md` first: it is the contract, and every item is marked **[S1]** (exists) or
**[planned: S<N>]** (does not exist yet). Keep it true in the same change as the code.

## What this repo is now
A Next.js 16 App Router site, every page prerendered. S1 is the scaffold: home, 404, design tokens and
three swappable visual directions, baseline security headers, Jest tests, the line-budget gate, CI,
Dockerfile and render.yaml. There is no server code, no database, no auth, no payments, no forms and
no API route (`/api/health` is a rewrite to the static home, for Render). Do not add any of those: the
design forbids them (contact is a booking link plus an obfuscated email).

## Commands
```bash
npm ci
npm test               # Jest, node environment, no network
npm run type-check     # tsc --noEmit
npm run lint           # eslint, zero warnings allowed
npm run loc            # line budgets: scripts/loc-budget.mjs
npm run build          # next build (output: standalone); must leave the git tree clean
npm start              # node .next/standalone/server.js (what Docker runs)
node scripts/smoke.mjs http://localhost:3000   # headers / health / 404 smoke of a running build
```

## Rules
- **Runtime dependencies are exactly `next`, `react`, `react-dom`**, exact versions (deps.test).
  Anything else is a devDependency, and only when a planned PR names it.
- **Colour, type, radius and shadow live in `styles/tokens.css` only.** CSS files exist only in
  `styles/`; `globals.css` uses tokens. Pages and components use classes: ESLint bans colour literals,
  named colours in colour props and inline `style` in `app/` and `components/` (lint-colour.test).
  Colour tokens are lowercase `#rrggbb`. A direction file redeclares exactly the token set and nothing
  else; every text pair meets WCAG AA and the focus ring 3:1, light and dark (tokens.test).
- **Line budgets are a gate.** `scripts/loc-budgets.json` holds the entry ceilings (total 14,447,
  lockfile excluded; entries must sum ≤ total; a new top-level entry needs one). Files: ≤ 600 lines,
  an override may raise one file to **2,000 at most (hard cap, not configurable)**, ≤ 100 bytes per
  allowed line, code lines ≤ 200 bytes, UTF-8 text only (binary by extension), no symlinks/submodules.
- **Security headers** live in `next.config.mjs` and are pinned by config.test; never weaken one
  without updating README "Security headers". Keep `agentRules: false` (otherwise `next dev` writes
  vendor text into this file).
- **Copy rules:** no "court-ready", "ready to file", "ensures compliance", guarantees, or
  percentage-of-fees pricing. The site is a consultancy, not a law firm. Prices stay `null`
  ("Price on request") until the owner sets them.
- **Tests must be able to fail.** Each new test is proven by breaking the code it guards once.
- `NEXT_PUBLIC_*` variables are public (inlined into JS). Never put a secret in one.
- Never commit to `main`; production auto-deploys it. Work lands as PRs into `site-v6`.

## Layout
`app/` pages · `styles/` tokens, directions, globals · `scripts/` loc-budget(s), smoke,
standalone-assets · `__tests__/site/` · `Dockerfile` · `render.yaml` · `.github/` CI + Dependabot.
Planned: `components/`, `content/`, `core/` (v2 engine, Ontario only), `demo/` (record/replay),
`e2e/` (see README).
