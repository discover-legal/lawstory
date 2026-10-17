# discover.legal

> **Status: under construction on `site-v6`.** This README is the contract for the clean-slate rewrite
> (design: Option C). Each PR into `site-v6` makes part of it true and updates this file in the same PR.
> Items marked **[S1]** exist now; items marked **[planned: S<N>]** do not exist yet. Production
> (`main`) still serves the previous product until the cutover. The previous product (accounts,
> payments, 110 jurisdictions, v1 engine) is preserved on the branch `archive/pre-pareback`.

discover.legal is the website of a **legal-technology consultancy**. It sells four services: **Buy**
(independent selection), **Build** (client-owned software), **Run** (managed operation on the firm's
own infrastructure) and **Advise** (fractional technical leadership). Each has packages and a clear
next step; every price is "Price on request" until the owner sets numbers. It also shows two free
products as **demos**:

1. **discover.legal Documents (Ontario)** [planned: S2–S6, S10]. A step-through replay of one real
   recorded AI interview with a fictional Ontario applicant ("Marcus"). The visitor clicks *Next*, or
   picks one of the recorded answers where the interview branches. The draft Application (General)
   and Divorce Order update as the replay moves, and the replay ends with watermarked PDFs. There is
   no free-text input, and no model is called while a visitor uses the site.
2. **BigLaw** [planned: S7]. The open-source multi-agent platform, hosted separately at its own
   origin and embedded here in an iframe (a poster when no demo URL is set).

The site stores nothing about visitors: no accounts, no database, no payments, no forms, no file
uploads. The next step is a **booking link** (primary) with an **obfuscated email** as the fallback.
The one third party is optional analytics: Google Analytics 4 loads only when `NEXT_PUBLIC_GA_ID` is
set, and then Google sets its own cookies (see Limitations).

---

## What is on disk

```
app/                         Next.js App Router. Every route is prerendered (`npm run build` fails otherwise).
  layout.tsx                 [S1] root layout: tokens, header, footer, metadata (Nav/Footer components: S7; GA: S6)
  page.tsx                   [S1] / minimal home: positioning, 4 services, the products (prices, CTA, demo links: S7)
  not-found.tsx, icon.svg    [S1] 404 ("Page not found"), favicon
  services/page.tsx          [planned: S7] /services   packages ("Price on request"), pricing rules, FAQ
  documents/page.tsx         [planned: S6] /documents  framing, iframe, "for law firms" CTA
  documents/embed/page.tsx   [planned: S6] /documents/embed  the replay player (noindex; the only frameable page)
  biglaw/page.tsx            [planned: S7] /biglaw     BigLaw demo iframe or poster; run-it-yourself / managed CTAs
  research/page.tsx          [planned: S7] /research   open experiments with their real status and repositories
  contact/page.tsx           [planned: S7] /contact    booking link first, obfuscated email second; works without JS
  privacy/page.tsx, terms/page.tsx, sitemap.ts, robots.ts   [planned: S7]
components/                  [planned: S6/S7] Nav, Footer, Cta, PackageCard, Price, Analytics (GA4),
                             DemoFrame, DemoBanner, player/{Player,Transcript,Chips,Preview}
content/site.ts, pricing.ts  [planned: S7] copy and packages as typed data; price === null renders "Price on request"
styles/tokens.css            [S1] the 15 semantic tokens (colour, type, radius, shadow, status), light + dark
styles/directions/*.css      [S1] case-file, protocol, chambers: token overrides only (see "Visual direction")
styles/globals.css           [S1] element styles written only against tokens
core/                        [planned: S2/S3] the v2 engine, trimmed to the Ontario divorce interview, plus
                             intelligence/tape.ts (record/replay) and render/watermark.ts
demo/                        [planned: S4/S5/S10] persona, fixtures, record.ts, build.ts, redact.ts
public/demo/                 [planned: S5] GENERATED, gitignored: tree.json, n/<node>.<kind>.html, DEMO-*.pdf
__tests__/site/              [S1] loc-budget, tokens, lint-colour, deps, config, deploy, repo (Jest, node, no network)
e2e/smoke.spec.mjs           [planned: S9] Playwright smoke against the standalone server
scripts/                     [S1] loc-budget.mjs + loc-budgets.json (line gate), colour-literals.json (lint list),
                             smoke.mjs (HTTP smoke), standalone-assets.mjs (prerender check + static copy after build)
Dockerfile, .dockerignore    [S1] standalone image, non-root, app files read-only, ENTRYPOINT [] (none)
render.yaml                  [S1] the production service as it will be after cutover (see "Deploy")
.github/                     [S1] workflows/ci.yml (the gates below); dependabot.yml (weekly npm + actions)
.nvmrc, .gitattributes, SECURITY.md   [S1] Node version (single source), LF endings, vulnerability reports
```

**Dependencies** [S1, `deps.test`]. Runtime: exactly `next`, `react`, `react-dom`, exact versions. Dev
(S1): `typescript`, `@types/{node,react,react-dom,jest}`, `eslint`, `eslint-config-next`, `jest`. Later
PRs add `pdfkit`, `tsx` (S3/S5), `openai` (recording only, S4), `jest-environment-jsdom`,
`@testing-library/react` (S6), `playwright-core` (S9). No Auth0, Stripe, pg, zod, Tailwind or js-yaml.

### Redirects (308, in `next.config.mjs`) [planned: S7]
| From | To |
|---|---|
| `www.`, `ca.`, `canada.`, `make.` hosts | apex `discover.legal`, same path |
| `/tools/documents`, `/tools/biglaw` | `/documents`, `/biglaw` |
| `/tos` | `/terms` |
| `/resources`, `/resources/:slug`, `/brand` | `/` (all 69 articles and the brand page are cut) |
| `/dashboard`, `/editor/:path*`, `/profile`, `/legal-profile`, `/respond`, `/serve`, `/hearing`, `/payment-success` | `/documents` |

Until S7 these paths answer 404 on the `site-v6` preview.

### Security headers [S1 baseline; S6 adds the frame, GA and embed rules]
`next.config.mjs` sends these on every path (exact values pinned by `config.test`, checked live by
`scripts/smoke.mjs`); they match or exceed the old production site:
- CSP `default-src 'self'; script-src 'self' 'unsafe-inline'` (Next's inline bootstrap); `style-src
  'self'; img-src 'self' data:; font-src/connect-src 'self'`; `frame-src`, `frame-ancestors`,
  `form-action`, `base-uri`, `object-src` all `'none'`; `upgrade-insecure-requests` only when
  `NEXT_PUBLIC_SITE_URL` is `https://…`. `next dev` adds `'unsafe-eval'` and inline styles.
- HSTS `max-age=63072000; includeSubDomains; preload`, `nosniff`, `X-Frame-Options: DENY`,
  `strict-origin-when-cross-origin`, a `Permissions-Policy` that turns devices and payment off, COOP and
  CORP `same-origin`, DNS prefetch off, `X-Permitted-Cross-Domain-Policies: none`; no `X-Powered-By`;
  the `/_next/image` optimizer is off.
- `X-Robots-Tag: noindex, nofollow` unless the build's `NEXT_PUBLIC_SITE_URL` is exactly
  `https://discover.legal`; `/api/health` (a copy of the home page) is always `noindex`.
- HTML is `public, max-age=0, must-revalidate` (Next's default is `s-maxage=31536000`); hashed
  `/_next/static` assets keep `immutable`.
- [planned: S6] `frame-src 'self' <BigLaw demo origin>`; `/documents/embed` gets `frame-ancestors 'self'`
  and `SAMEORIGIN`. Only when `NEXT_PUBLIC_GA_ID` matches `^G-[A-Z0-9]{4,16}$`: Google's GA4 origins
  (`*.googletagmanager.com` in `script-src`; it plus `*.google-analytics.com`, `*.analytics.google.com`
  in `connect-src` and `img-src`). Unset, no Google origin appears anywhere.

### Visual direction [S1]
`styles/tokens.css` defines `--bg --surface --ink --muted --line --accent --accent-ink --ok --wait
--stop --shadow-raised` (light and dark) and `--font-display --font-body --radius-card
--radius-control`. Each direction file redeclares exactly that set on `:root` (light and
`prefers-color-scheme: dark`) and nothing else. **No direction is picked**: the site renders the neutral
tokens; picking one is the commented import in `app/layout.tsx`. Sources: `ui-directions/{a,b,c}.html`
(Case File, Protocol, Chambers); Protocol's light `--wait` is `#9c5800` (the source's is 4.31:1).
`tokens.test`: colour tokens are lowercase `#rrggbb`; WCAG AA (4.5:1) for every text pair, status colours
on both backgrounds, every file and scheme; 3:1 for the focus ring. `--line` is decorative only and not
contrast-tested. `globals.css` has no colour literal (`var()` fallbacks included) and takes type, radius
and shadow from tokens; CSS exists only in `styles/`; `app/icon.svg` uses light token values.
`lint-colour.test`: in `app/`, `components/` and `content/` ESLint bans inline styles (`style` and
`dangerouslySetInnerHTML` props/keys, `.style`, `innerHTML`, `<style>`, SVG `<animate>`/`<set>`); colour
slots (`fill`, `stroke`, any `*color`/`*Color` prop, key or attribute name) take only `none`,
`currentColor`, `inherit`, `transparent` or `var(--token)`; and no string is a hex or colour-function
value or a CSS colour declaration. A colour assembled at runtime is not detected.

---

## The Ontario replay pipeline [planned: S2–S5, S10]

```
 demo/personas/on-marcus.json ─► demo:record ─► demo/fixtures/on-marcus/v1/{manifest,tape,snapshot}  (owner, real model, once)
 fixtures ─► demo:build (prebuild) ─► core/ engine + Tape(replay) + frozen clock
          ├─► public/demo/on-marcus/v1/tree.json             transcript tree
          ├─► public/demo/on-marcus/v1/n/<node>.<kind>.html  draft preview per step
          └─► public/demo/on-marcus/v1/DEMO-on-marcus-<leaf>-<kind>.pdf  (watermarked)
 /documents/embed  Player: reads only those static files; Next / Back / chips; PDF links at the end
```
Every model call during recording goes through `Tape(record)` keyed by
`kind:purpose:sha256(canonical request)`; the build replays with no model and fails with
`re-record: npm run demo:record -- on-marcus` on a tape miss. Clock and IDs are frozen to
`manifest.recordedAt` and a seed. A permanent banner reads: "Demo — a scripted replay of a recorded AI
run with a fictional person. Nothing you do is saved. Not legal advice. Recorded <date>."

---

## Run it

```bash
npm ci
npm run dev            # [S1] next dev on :3000 (from S5 it first runs demo:build); works offline, no keys
npm test               # [S1] Jest: deterministic, no network
npm run type-check && npm run lint      # [S1]
npm run loc            # [S1] line budgets (also in CI)
npm run build          # [S1] next build (standalone), prerender check, static assets; from S5 demo:build first
npm start              # [S1] node .next/standalone/server.js on $PORT (default 3000), as the Docker image does
node scripts/smoke.mjs http://localhost:3000   # [S1] smoke of a running build (waits up to 30 s for it)
npm run e2e            # [planned: S9]
# Docker (the image Render builds). Public settings are build args, not runtime -e variables:
docker build -t discover-legal --build-arg NEXT_PUBLIC_SITE_URL=http://localhost:3000 .
docker run --rm -p 3000:3000 discover-legal      # PORT=3000 and HOSTNAME=0.0.0.0 are baked in
```

### Environment (`.env.example` arrives with the first variable a page reads, S6/S7)
| Variable | Where | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | build | [S1] Canonical origin. Exactly `https://discover.legal` (render.yaml): indexable. Otherwise every response says `noindex`. S7: sitemap, robots, `metadataBase`. |
| `NEXT_PUBLIC_BOOKING_URL` | build | [planned: S7] Scheduler link, the primary CTA. Unset: CTAs use the obfuscated email. |
| `NEXT_PUBLIC_GA_ID` | build | [planned: S6] GA4 ID (`G-…`). Unset: no analytics, no Google origin in the CSP. Never production's ID on a preview. |
| `NEXT_PUBLIC_BIGLAW_DEMO_URL` | build | [planned: S7] BigLaw demo origin to embed. Unset: /biglaw shows a poster; `frame-src` stays `'none'`. |
| `DEMO_LLM_API_KEY`, `DEMO_LLM_BASE_URL`, `DEMO_LLM_MODEL` | owner's machine | [planned: S4] `demo:record` only. Never set on Render. |

`NEXT_PUBLIC_*` values are inlined into public output at build time: never put a secret in one. Every
`.env*` file except `.env.example` is git- and docker-ignored (`repo.test`). The Dockerfile declares the
four public ones as `ARG`s; S1 reads only `NEXT_PUBLIC_SITE_URL`.

### Line budgets [S1]
`npm run loc` counts every git-visible file except `package-lock.json` against
`scripts/loc-budgets.json` (total 14,447; PLAN.md "Line budget allocation" says which PR fills each
entry). A line ends at LF, CRLF or a lone CR, and counts once per started 200 bytes, in every text type,
so one-line and minified files are charged for their size. The gate fails when: the budgets file is not
exactly `{total, maxFile, files, entries}` of positive integers; entries sum above the total; the total
or an entry is over budget, or an entry has none; a file is over 600 lines, or over its `files`
override, and never above the hard cap of **2,000** (in the script); a file is not UTF-8 text without
NUL and its extension is not binary (png jpg gif webp ico woff woff2 pdf: not counted, ≤ 1 MB; text is
counted whatever its extension); or a path is a symlink, a submodule or not a regular file.

### Test [S1]
- `npm test`: 7 suites in `__tests__/site/` (their `it` names state what each pins): `loc-budget`,
  `tokens`, `lint-colour`, `deps`, `config`, `deploy`, `repo`.
- CI (`.github/workflows/ci.yml`) runs on pushes to `main` and `site-v6` and on PRs into either (PR
  branches have no push trigger, so nothing runs twice; only PR runs cancel each other), on
  `ubuntu-24.04`, Node from `.nvmrc`, actions pinned by SHA, no persisted credentials. Job `gates`
  (3 min): `npm ci` → `npm audit --omit=dev` → type-check → lint → test → loc → build → clean tree →
  no `sharp`/`@img` in the bundle → smoke. Job `image` (3 min, parallel): `docker build`, smoke, user
  `node`, `/app/server.js` not writable, no entrypoint.
- [planned] S5: replay determinism (build twice, compare sha256 of `public/demo/**`). S9: Playwright smoke
  (every route 200/308, replay to a leaf, `DEMO-…` PDF is `%PDF`, `/contact` booking link without JS,
  0 console errors except a 404 page's own document, no Google request with GA unset, gtag allowed with
  a test ID).

### Deploy
- **Production (after cutover):** `render.yaml` describes one Docker web service (starter plan,
  `autoDeploy` from `main`, health check `/api/health`, `NEXT_PUBLIC_SITE_URL=https://discover.legal`,
  `maxShutdownDelaySeconds: 60`, no pre-deploy command, database or cron; a disk only as the old
  `affidavit-documents` stanza, which PLAN C may keep until P2). It keeps the service name
  `affidavit-maker` so a Blueprint sync updates the live service in place. `/api/health` is a rewrite to
  the static home; the old site also answers it, even in maintenance mode (PLAN C).
- **Preview of `site-v6` (by hand in the Render dashboard, never from render.yaml):** New → Web Service →
  this repo, branch `site-v6`, runtime Docker, Dockerfile `./Dockerfile`, plan Free, health check
  `/api/health`, auto-deploy on, no env vars (so `noindex`). Render passes service env vars to Docker
  builds as build args (declared as `ARG`s; not yet verified live). A Free service sleeps when idle:
  warm it with one request before a smoke.
- Rollback: Render "Rollback" to the previous deploy, or revert the merge on `main`.

---

## Limitations

- **Quality of the Documents demo is unproven** until one v2 recording passes the R0 lawyer checklist.
- **No live chat with the model.** The replay shows only what was recorded.
- **Analytics and consent.** With `NEXT_PUBLIC_GA_ID` set, GA4 sets cookies and sends page views to
  Google, with no consent banner or Consent Mode; whether PIPEDA or GDPR visitors need one is an
  owner/legal decision (cheapest: Consent Mode v2 default `denied`). The privacy page (S7) must disclose GA.
- **Webfonts are not bundled.** Directions name their families with system fallbacks; the picked
  direction's fonts get self-hosted (`next/font/local`, OFL files) when the owner picks one.
- **Indexing depends on one build variable.** Without `NEXT_PUBLIC_SITE_URL=https://discover.legal` at
  build time, production says `noindex` (the C verify step checks it).
- **No licence.** `UNLICENSED`, no LICENSE file: the public source is all rights reserved (owner decision).
- **The line budget is tight.** Entries sum to exactly 14,447 because S2 must trim the ported code
  (`core/` ≤ 4,890, ported suites ≤ 2,700) and S1's gates outgrew their estimate (PLAN.md allocation). A
  PR that cannot fit says so and the owner decides; budgets are not raised silently. Per-file manifest
  ceilings are not enforced (entries, 600 and the 2,000 hard cap are).
- **Dev-tool advisories.** `npm audit --omit=dev` is 0 (a gate); dev-only `braces` (via
  `eslint-config-next`) and `sprintf-js` (via `jest`) remain, DoS on inputs this repo controls. ESLint is
  9.39.5 (marked unsupported) because `eslint-config-next`'s React plugin rejects ESLint 10.
- **Base image pinned by tag** (`node:22.22.0-bookworm-slim`), not digest, and bumped by hand: the two
  `FROM` lines and `.nvmrc` together (deploy.test); Dependabot covers only npm and actions.
- **`npm ls --omit=dev` prints two `extraneous` packages** (`@img/sharp-wasm32`, `@emnapi/runtime`), a
  lockfile artefact of `sharp`; they are not shipped (`outputFileTracingExcludes`, checked in CI).
- **CI is unproven on GitHub.** This workflow has never run there (no PR open yet; it triggers only for
  PRs into and pushes to `main`/`site-v6`), so the 3-minute job budgets are measured locally only. A PR
  run tests the merge result with its base. Dependabot starts only once its file is on `main`.
- **No private vulnerability channel yet.** `SECURITY.md` points at GitHub private vulnerability
  reporting, which was off on 2026-10-17; the owner enables it before C (PLAN P0/C).
- **Next.js error pages kept as is.** `/_global-error` and the static 500 page are Next's own: unbranded,
  and their inline styles are blocked by `style-src 'self'`, so a visitor who hits a server error sees
  it unstyled (CSP console errors). Any POST with a `Next-Action` header logs one error line (log noise).
- **Colour lint has known false positives:** a whole-string `#add`-like anchor (valid hex), the string
  `style`, or a `Background: red …` phrase inside a string is flagged; rename or move such copy.
- **Unverified Render behaviour.** Blueprint sync, whether a sync drops a disk or domain render.yaml no
  longer lists, and any CDN in front are unverified (PLAN P0 answers them before S2 merges).
