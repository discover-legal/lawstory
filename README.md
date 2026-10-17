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
  page.tsx                   [S1] / minimal home: positioning, 4 services, 2 demos (prices, CTA, demo links: S7)
  not-found.tsx, icon.svg    [S1]
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
core/                        [planned: S2/S3] the v2 engine, trimmed to the Ontario divorce interview, plus
                             intelligence/tape.ts (record/replay) and render/watermark.ts
demo/                        [planned: S4/S5] persona, fixtures, record.ts, build.ts, redact.ts
public/demo/                 [planned: S5] GENERATED, gitignored: tree.json, n/<node>.<kind>.html, DEMO-*.pdf
__tests__/site/              [S1] loc-budget, tokens, deps (Jest, node environment, no network)
e2e/smoke.spec.mjs           [planned: S9] Playwright smoke against `next start`
scripts/loc-budget.mjs       [S1] fails CI if the total, a top-level entry or a file exceeds its line budget
Dockerfile, .dockerignore    [S1] standalone image, non-root, app files read-only, no entrypoint
render.yaml                  [S1] the production service as it will be after cutover (see "Deploy")
.github/workflows/ci.yml     [S1] the CI gates below
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

### Security headers [planned: S6]
- CSP: `default-src 'self'`; `script-src 'self' 'unsafe-inline'` (Next's inline bootstrap needs it).
- `form-action 'none'` (the site has no forms); `connect-src 'self'`; `img-src 'self' data:`;
  `frame-src 'self' <BigLaw demo origin>`.
- Only when `NEXT_PUBLIC_GA_ID` is set: `https://www.googletagmanager.com` in `script-src`, and
  `https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com` in
  `connect-src` and `img-src`. Unset, no Google origin appears anywhere.
- `frame-ancestors 'none'` and `X-Frame-Options: DENY` everywhere, **except** `/documents/embed`
  (`frame-ancestors 'self'`, `SAMEORIGIN`).
- [S1] `X-Powered-By` is off and the `/_next/image` optimizer is disabled (`images.unoptimized`).

### Visual direction [S1]
`styles/tokens.css` defines `--bg --surface --ink --muted --line --accent --accent-ink --ok --wait
--stop --shadow-raised` (light and dark) and `--font-display --font-body --radius-card
--radius-control`. Each direction file redeclares exactly that set on `:root` (light block and
`prefers-color-scheme: dark` block) and nothing else. **No direction is picked**; the site renders the
neutral tokens. Picking one is the commented import line in `app/layout.tsx`. Sources:
`ui-directions/{a,b,c}.html` (A Case File, B Protocol, C Chambers). Tests: exact token sets, WCAG AA
(4.5:1) for every text pair in every file and scheme, and no colour literal in `globals.css`; an
ESLint rule rejects colour literals in `app/` and `components/`.

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
npm run build          # [S1] next build (standalone); from S5 demo:build runs first
npm start              # [S1] next start on $PORT (default 3000); the Docker image runs .next/standalone/server.js
npm run e2e            # [planned: S9]
```

### Environment (`.env.example` arrives with the first variable that is read, S6/S7)
| Variable | Where | Purpose |
|---|---|---|
| `NEXT_PUBLIC_BOOKING_URL` | build | [planned: S7] Scheduler link, the primary CTA. Unset: CTAs use the obfuscated email. |
| `NEXT_PUBLIC_GA_ID` | build | [planned: S6] GA4 measurement ID (`G-…`). Unset: no analytics script, no Google origin in the CSP. |
| `NEXT_PUBLIC_BIGLAW_DEMO_URL` | build | [planned: S7] BigLaw demo origin to embed. Unset: /biglaw shows a poster; `frame-src` stays `'self'`. |
| `DEMO_LLM_API_KEY`, `DEMO_LLM_BASE_URL`, `DEMO_LLM_MODEL` | owner's machine | [planned: S4] `demo:record` only. Never set on Render. |

`NEXT_PUBLIC_*` values are inlined into public JavaScript at build time: never put a secret in one.
S1 reads no environment variable; the Dockerfile and render.yaml already declare the three public ones.

### Test [S1]
- `npm test` runs `__tests__/site/{loc-budget,tokens,deps}.test.ts` (20 tests). CI runs them on every
  push to `site-v6` / `site-v6-*` (PR branches; `site-v6/…` is impossible next to the `site-v6` branch) and every PR into `site-v6`.
- CI (`.github/workflows/ci.yml`, one job, `timeout-minutes: 3`): `npm ci` → type-check → lint →
  test → loc → build → the build must leave the git tree clean. Actions are pinned by commit SHA.
- [planned] S5 adds the replay determinism pin (build twice, compare sha256 of `public/demo/**`); S9
  adds the Playwright smoke (every route 200/308, replay to a leaf, `DEMO-…` PDF starting `%PDF`,
  `/contact` shows the booking link with JavaScript off, 0 console errors).

### Deploy
- **Production (after cutover):** `render.yaml` describes one Docker web service on the starter plan,
  `autoDeploy` from `main`, health check `/`, no pre-deploy command, disk, database or cron. It keeps
  the existing service name `affidavit-maker` so a Blueprint sync updates the live service in place.
- **Preview of `site-v6` (created by hand in the Render dashboard, not by render.yaml):** New → Web
  Service → this repo, branch `site-v6`, runtime Docker, Dockerfile path `./Dockerfile`, plan Free,
  health check path `/`, auto-deploy on, no env vars needed for S1 (add the three `NEXT_PUBLIC_*`
  later; Render documents that it passes service env vars to Docker builds as build args, which the
  Dockerfile declares as `ARG`s; not yet verified on a live preview).
- Rollback: Render "Rollback" to the previous deploy, or revert the merge on `main`.

---

## Limitations

- **Quality of the Documents demo is unproven.** It depends on one v2 recording that has not yet
  passed the R0 lawyer checklist (PLAN.md R0).
- **No live chat with the model.** The replay shows only what was recorded.
- **Analytics and consent.** With `NEXT_PUBLIC_GA_ID` set, GA4 sets cookies and sends page views to
  Google. There is no consent banner and no Consent Mode configuration; whether PIPEDA (Canada) or
  GDPR visitors require one is an owner/legal decision, and the privacy page (S7) must disclose GA
  whenever it is on. Unset, there is no tracking at all and no engagement data.
- **Webfonts are not bundled.** Direction files name their families (Archivo/Spectral, Schibsted
  Grotesk, Gloock/Manrope) with system fallbacks; visitors without those fonts installed see the
  fallbacks. The picked direction's fonts get self-hosted (`next/font/local`) when the owner picks one,
  so builds stay offline.
- **No security headers or redirects yet** (S6/S7). The S1 preview is a static page with no inputs.
- **Dev-tool advisories.** `npm audit` reports 0 production vulnerabilities; dev-only advisories
  remain in `braces` (via `eslint-config-next`) and `sprintf-js` (via `jest`), both DoS on patterns or
  format strings this repo controls. ESLint is pinned to 9.39.5, which ESLint marks unsupported,
  because `eslint-plugin-react` (inside `eslint-config-next`) does not yet accept ESLint 10.
- **Base image pinned by tag** (`node:22.22.0-bookworm-slim`), not by digest.
- **`npm ls --omit=dev` shows two `extraneous` packages** (`@img/sharp-wasm32`, `@emnapi/runtime`):
  an npm lockfile artefact of `sharp`, Next's optional image library, which this site does not use.
- **Unverified Render behaviour.** Whether the production service is Blueprint-synced, and whether
  Render deletes resources removed from `render.yaml`, is unverified (PLAN.md C and P steps).
