# CLAUDE.md: discover.legal (site-v6 rewrite)

Read `README.md` first: it is the contract, and every item is marked **[S1]** (exists) or
**[planned: S<N>]** (does not exist yet). Keep it true in the same change as the code.

## What this repo is now
A Next.js 16 App Router site, every page prerendered. S1 is the scaffold: home, 404, design tokens and
three swappable visual directions, Jest tests, the line-budget gate, CI, Dockerfile and render.yaml.
There is no server code, no database, no auth, no payments, no forms and no API route. Do not add any
of those: the design forbids them (contact is a booking link plus an obfuscated email).

## Commands
```bash
npm ci
npm test               # Jest, node environment, no network
npm run type-check     # tsc --noEmit
npm run lint           # eslint, zero warnings allowed
npm run loc            # line budgets: scripts/loc-budget.mjs
npm run build          # next build (output: standalone); must leave the git tree clean
```

## Rules
- **Runtime dependencies are exactly `next`, `react`, `react-dom`**, exact versions (deps.test).
  Anything else is a devDependency, and only when a planned PR names it.
- **Colour, type, radius and shadow live in `styles/tokens.css` only.** Pages and components use
  `var(--token)` (ESLint bans colour literals in `app/` and `components/`). A direction file in
  `styles/directions/` redeclares exactly the token set and nothing else (tokens.test). Every text
  colour pair must meet WCAG AA in every direction, light and dark (tokens.test).
- **Line budgets are a gate.** `scripts/loc-budget.mjs` holds per-entry ceilings (total 14,447,
  lockfile excluded, any single file ≤ 600). A new top-level entry needs a budget there.
- **Copy rules:** no "court-ready", "ready to file", "ensures compliance", guarantees, or
  percentage-of-fees pricing. The site is a consultancy, not a law firm. Prices stay `null`
  ("Price on request") until the owner sets them.
- **Tests must be able to fail.** Each new test is proven by breaking the code it guards once.
- `NEXT_PUBLIC_*` variables are public (inlined into JS). Never put a secret in one.
- Never commit to `main`; production auto-deploys it. Work lands as PRs into `site-v6`.

## Layout
`app/` pages · `styles/` tokens, directions, globals · `scripts/loc-budget.mjs` · `__tests__/site/`
· `Dockerfile` · `render.yaml` · `.github/workflows/ci.yml`. Planned: `components/`, `content/`,
`core/` (v2 engine, Ontario only), `demo/` (record/replay), `e2e/` (see README).
