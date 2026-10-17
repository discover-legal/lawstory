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
app/                         Next.js App Router. Every page is prerendered at build time.
  layout.tsx                 [S1] root layout: tokens, header, footer, metadata (Nav/Footer components: S7; GA: S6)
  page.tsx                   [S1] / minimal home: positioning, 4 services, the products (prices, CTA, demo links: S7)
  not-found.tsx, global-error.tsx, icon.svg   [S1] 404 ("Page not found"), root-layout error page, favicon
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
styles/
  tokens.css                 [S1] the 15 semantic tokens (colour, type, radius, shadow, status), light + dark;
                             also the neutral look used while no direction is picked
  directions/*.css           [S1] case-file, protocol, chambers: token overrides only (see "Visual direction")
  globals.css                [S1] element styles written only against tokens
  colour-literals.json       [S1] the colour syntaxes banned outside styles/ (ESLint rule + tests)
core/                        [planned: S2/S3] the v2 engine, trimmed to the Ontario divorce interview, plus
                             intelligence/tape.ts (record/replay) and render/watermark.ts
demo/                        [planned: S4/S5/S10] persona, fixtures, record.ts, build.ts, redact.ts
public/demo/                 [planned: S5] GENERATED, gitignored: tree.json, n/<node>.<kind>.html, DEMO-*.pdf
__tests__/site/              [S1] loc-budget, tokens, lint-colour, deps, config, deploy, repo (Jest, node, no network)
e2e/smoke.spec.mjs           [planned: S9] Playwright smoke against the standalone server
scripts/loc-budget.mjs       [S1] the line-budget gate ("Line budgets"); budgets in scripts/loc-budgets.json
scripts/smoke.mjs            [S1] HTTP smoke of a running build (headers, health, 404, CSS, no image optimizer)
scripts/standalone-assets.mjs  [S1] copies .next/static and public/ into the standalone bundle after next build
Dockerfile, .dockerignore    [S1] standalone image, non-root, app files read-only, ENTRYPOINT [] (none)
render.yaml                  [S1] the production service as it will be after cutover (see "Deploy")
.github/workflows/ci.yml     [S1] the CI gates below; .github/dependabot.yml [S1] weekly npm/actions/docker updates
.nvmrc, .gitattributes, SECURITY.md   [S1] Node version (single source), LF endings, private vulnerability reports
```

**Dependencies** [S1, enforced by `__tests__/site/deps.test.ts`]. Runtime: exactly `next`, `react`,
`react-dom`, pinned to exact versions. Dev (S1): `typescript`, `@types/{node,react,react-dom,jest}`,
`eslint`, `eslint-config-next`, `jest`. Later PRs add `pdfkit` and `tsx` (build time, S3/S5), `openai`
(recording only, S4), `jest-environment-jsdom`, `@testing-library/react` (S6) and `playwright-core`
(S9). There is no Auth0, Stripe, pg, zod, Tailwind, lucide-react or js-yaml.

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
`next.config.mjs` `headers()` sends on every path (pinned by `__tests__/site/config.test.ts`, checked
live by `scripts/smoke.mjs`); this matches or exceeds what the old production site sends:
- CSP: `default-src 'self'; script-src 'self' 'unsafe-inline'` (Next's inline bootstrap needs it)
  `; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-src 'none';
  frame-ancestors 'none'; form-action 'none'; base-uri 'none'; object-src 'none';
  upgrade-insecure-requests`. Under `next dev` only, `'unsafe-eval'` and inline styles are added.
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`, `X-Content-Type-Options:
  nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`,
  `Permissions-Policy` (camera, microphone, geolocation, payment, usb, sensors off), COOP and CORP
  `same-origin`, `X-DNS-Prefetch-Control: off`, `X-Permitted-Cross-Domain-Policies: none`.
- `X-Robots-Tag: noindex, nofollow` unless the build's `NEXT_PUBLIC_SITE_URL` is exactly
  `https://discover.legal`, so previews and local builds are never indexed; `/api/health` (a copy of
  the home page) is always `noindex`.
- HTML is `Cache-Control: public, max-age=0, must-revalidate` (Next's default for prerendered HTML is
  `s-maxage=31536000`); hashed `/_next/static` assets keep Next's `immutable`.
- `X-Powered-By` is off and the `/_next/image` optimizer is disabled (`images.unoptimized`).
- [planned: S6] `frame-src 'self' <BigLaw demo origin>`; `/documents/embed` gets `frame-ancestors
  'self'` and `SAMEORIGIN`. Only when `NEXT_PUBLIC_GA_ID` matches `^G-[A-Z0-9]{4,16}$`:
  `https://*.googletagmanager.com` in `script-src`, and `https://*.google-analytics.com
  https://*.analytics.google.com https://*.googletagmanager.com` in `connect-src` and `img-src` (Google's
  published GA4 list). Unset, no Google origin appears anywhere.

### Visual direction [S1]
`styles/tokens.css` defines `--bg --surface --ink --muted --line --accent --accent-ink --ok --wait
--stop --shadow-raised` (light and dark) and `--font-display --font-body --radius-card
--radius-control`. Each direction file redeclares exactly that set on `:root` (light block and
`prefers-color-scheme: dark` block) and nothing else. **No direction is picked**; the site renders the
neutral tokens. Picking one is the commented import line in `app/layout.tsx`. Sources:
`ui-directions/{a,b,c}.html` (A Case File, B Protocol, C Chambers); Protocol's light `--wait` is
`#9c5800` (the source's `#a85f00` is 4.31:1 on its `--bg`). Tests (`tokens.test`, `lint-colour.test`):
every colour token is lowercase `#rrggbb` (no alpha, no other syntax, so no ratio can be NaN); WCAG AA
(4.5:1) for every text pair in every file and scheme, including status colours on both backgrounds;
3:1 for the focus ring (`--accent`). `--line` is decorative only (separators, never the sole boundary of
a control; the site has no form controls) and is not contrast-tested. `globals.css` has no colour
literal and takes type, radius and shadow from tokens; CSS files exist only in `styles/`;
`app/icon.svg` uses only light-scheme token values. In `app/` and `components/` (`.js/.jsx/.ts/.tsx/
.mjs`), ESLint rejects hex, colour functions (`rgb hsl hwb lab lch oklab oklch color color-mix`),
named colours in colour props, and inline styles (`style` props or properties, `<style>` elements).
The rule matches literals: a colour assembled at runtime from string fragments is not detected.

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
npm run build          # [S1] next build (standalone) + copy static assets into it; from S5 demo:build runs first
npm start              # [S1] node .next/standalone/server.js on $PORT (default 3000), as the Docker image does
node scripts/smoke.mjs http://localhost:3000   # [S1] headers/health/404 smoke of a running build
npm run e2e            # [planned: S9]
# Docker (the image Render builds). Public settings are build args, not runtime -e variables:
docker build -t discover-legal --build-arg NEXT_PUBLIC_SITE_URL=http://localhost:3000 .
docker run --rm -p 3000:3000 discover-legal      # PORT=3000 and HOSTNAME=0.0.0.0 are baked in
```

### Environment (`.env.example` arrives with the first variable a page reads, S6/S7)
| Variable | Where | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | build | [S1] Canonical origin. Exactly `https://discover.legal` (set in render.yaml): indexable. Anything else or unset: every response says `noindex`. S7 uses it for the sitemap, robots and `metadataBase`. |
| `NEXT_PUBLIC_BOOKING_URL` | build | [planned: S7] Scheduler link, the primary CTA. Unset: CTAs use the obfuscated email. |
| `NEXT_PUBLIC_GA_ID` | build | [planned: S6] GA4 measurement ID (`G-…`). Unset: no analytics script, no Google origin in the CSP. Never set production's ID on a preview (it would pollute production's data). |
| `NEXT_PUBLIC_BIGLAW_DEMO_URL` | build | [planned: S7] BigLaw demo origin to embed. Unset: /biglaw shows a poster; `frame-src` stays `'none'`. |
| `DEMO_LLM_API_KEY`, `DEMO_LLM_BASE_URL`, `DEMO_LLM_MODEL` | owner's machine | [planned: S4] `demo:record` only. Never set on Render. |

`NEXT_PUBLIC_*` values are inlined into public output at build time: never put a secret in one. Every
`.env*` file except `.env.example` is git- and docker-ignored (`repo.test`). The Dockerfile declares all
four public ones as `ARG`s; S1 reads only `NEXT_PUBLIC_SITE_URL` (in `next.config.mjs`).

### Line budgets [S1]
`npm run loc` counts every git-visible file except `package-lock.json`. Lines are newlines plus an
unterminated last line (never more than `tools/loc.py` counts). It fails when: the total (14,447) or an
entry is over budget, or an entry has none; entry budgets sum above the total; a file is over 600 lines
(an override in `files` may raise one file, never above the hard cap of **2,000**, which lives in the
script); a file is over 100 bytes per allowed line; a code line (`.js/.ts/.css` family) is over 200
bytes; a file is not UTF-8 text without NUL (binary is decided by extension only: png jpg gif webp ico
woff woff2 pdf, capped at 1 MB); or a path is a symlink, a submodule or not a regular file.

### Test [S1]
- `npm test` runs 7 suites in `__tests__/site/` (97 tests): `loc-budget` (every dodge above, per file
  type, and every planned path has an entry budget), `tokens`, `lint-colour` (runs the real ESLint
  config), `deps` (exact pins; lockfile root, resolved and installed versions; npmjs.org + sha512
  integrity), `config` (headers, CSP, noindex, caching, rewrites, standalone, no X-Powered-By, image
  optimizer and agent-file writing off), `deploy` (render.yaml, Dockerfile, .nvmrc, CI), `repo`
  (ignore rules, internal links resolve, 404 title).
- CI (`.github/workflows/ci.yml`) runs on every push to `site-v6` and every PR into it, one concurrency
  group per PR, on `ubuntu-24.04` with Node from `.nvmrc`, actions pinned by SHA, checkout without
  persisted credentials. Job `gates` (3 min): `npm ci` → `npm audit --omit=dev` → type-check → lint →
  test → loc → build → the tree must be clean → the standalone bundle has no `sharp`/`@img` and passes
  `scripts/smoke.mjs`. Job `image` (3 min, in parallel): `docker build`, then the container runs as
  `node`, cannot write `/app/server.js`, has no entrypoint, and passes the smoke.
- The `gates` and `image` checks should be required on `site-v6` (and on `main` before C): branch
  protection is the owner's setting and was not readable from this session.
- [planned] S5 adds the replay determinism pin (build twice, compare sha256 of `public/demo/**`); S9
  adds the Playwright smoke (every route 200/308, replay to a leaf, `DEMO-…` PDF starting `%PDF`,
  `/contact` shows the booking link with JavaScript off, 0 console errors other than a 404 page's own
  document, no Google request with GA unset and the gtag loader allowed by the CSP with a test GA ID).

### Deploy
- **Production (after cutover):** `render.yaml` describes one Docker web service on the starter plan,
  `autoDeploy` from `main`, health check `/api/health`, `NEXT_PUBLIC_SITE_URL=https://discover.legal`,
  no pre-deploy command, disk, database or cron. It keeps the existing service name `affidavit-maker`
  so a Blueprint sync updates the live service in place. `/api/health` is a rewrite to the static home
  (no API code); the old site also answers it, even in maintenance mode, so the health check can move
  there before the cutover merge (PLAN C).
- **Preview of `site-v6` (created by hand in the Render dashboard, not by render.yaml):** New → Web
  Service → this repo, branch `site-v6`, runtime Docker, Dockerfile path `./Dockerfile`, plan Free,
  health check path `/api/health`, auto-deploy on, no env vars (so it is `noindex`; add the
  `NEXT_PUBLIC_*` values later; Render passes service env vars to Docker builds as build args, which
  the Dockerfile declares as `ARG`s; not yet verified on a live preview). A Free service spins down
  when idle: the first request after a pause is slow, so smoke runs against it need a warm-up request.
- Rollback: Render "Rollback" to the previous deploy, or revert the merge on `main`.

---

## Limitations

- **Quality of the Documents demo is unproven.** It depends on one v2 recording that has not yet
  passed the R0 lawyer checklist (PLAN.md R0).
- **No live chat with the model.** The replay shows only what was recorded.
- **Analytics and consent.** With `NEXT_PUBLIC_GA_ID` set, GA4 sets cookies and sends page views to
  Google. There is no consent banner and no Consent Mode configuration; whether PIPEDA (Canada) or
  GDPR visitors require one is an owner/legal decision (the cheap option is a one-line Consent Mode v2
  default of `denied`), and the privacy page (S7) must disclose GA whenever it is on. Unset, there is
  no tracking at all and no engagement data.
- **Webfonts are not bundled.** Direction files name their families (Archivo/Spectral, Schibsted
  Grotesk, Gloock/Manrope) with system fallbacks; visitors without those fonts installed see the
  fallbacks. The picked direction's fonts get self-hosted (`next/font/local`, with their OFL licence
  files) when the owner picks one, so builds stay offline.
- **Indexing depends on one build variable.** Production is indexable only if its build has
  `NEXT_PUBLIC_SITE_URL=https://discover.legal`; if the cutover misses it, the live site says
  `noindex` (the C verify step checks for it).
- **No licence.** `package.json` says `UNLICENSED` and there is no LICENSE file, so the public source
  is all rights reserved, not open source. Choosing a licence is an owner decision.
- **The line budget is tight.** Entry budgets sum to exactly 14,447 only because S2 must trim the
  ported code: `core/` ≤ 4,890 (5,066 measured + 475 new → trim ≥ 651) and the ported core suites
  ≤ 2,700 of 3,353 (PLAN.md "Line budget allocation"). If a PR cannot fit, it says so and the owner
  decides; budgets are not raised silently. The manifest's per-file ceilings are not enforced (entries, the 600 default and the 2,000
  hard cap are): S1's own files already outgrew those estimates (tokens.test: 40 planned).
- **Dev-tool advisories.** `npm audit --omit=dev` reports 0 (a CI gate); dev-only advisories remain
  in `braces` (via `eslint-config-next`) and `sprintf-js` (via `jest`), both DoS on patterns or
  format strings this repo controls. ESLint is pinned to 9.39.5, which ESLint marks unsupported,
  because `eslint-plugin-react` (inside `eslint-config-next`) does not yet accept ESLint 10.
- **Base image pinned by tag** (`node:22.22.0-bookworm-slim`), not by digest.
- **`npm ls --omit=dev` still prints two `extraneous` packages** (`@img/sharp-wasm32`, `@emnapi/runtime`):
  a lockfile artefact of `sharp`, Next's optional image library. They are not shipped:
  `outputFileTracingExcludes` keeps `sharp`, `@img` and `@emnapi` out of the standalone bundle (CI checks).
- **CI coverage.** Pushes to a `site-v6-*` branch run CI only once a PR into `site-v6` is open, and
  a PR's check is its head commit, not the merge result (`site-v6`'s own push run tests that).
  Dependabot reads its config only from the default branch, so it starts after the cutover. The
  committed `SECURITY.md` route needs GitHub private vulnerability reporting switched on (unverified).
- **Next.js behaviour kept as is.** `/_global-error` (and the static 500 page Next copies from it)
  answers 500 with Next's own unbranded page; `app/global-error.tsx` only covers errors in the root
  layout at runtime. Any POST with a `Next-Action` header logs one error line per request (log noise).
- **Unverified Render behaviour.** Whether production is Blueprint-synced, whether a sync deletes a
  disk or custom domain that `render.yaml` no longer lists, and whether a CDN honours `Cache-Control`
  in front of it are unverified (PLAN.md P0 answers them before S2 merges; C keeps the disk until P2).
