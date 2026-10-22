# discover.legal

> **Status: under construction on `site-v6`.** This README is the contract for the clean-slate rewrite
> (design: Option C). Each PR into `site-v6` makes part of it true and updates this file in the same PR.
> Items marked **[S1]** or **[S2-sample]** exist now; items marked **[planned: S<N>]** do not exist yet. Production
> (`main`) still serves the previous product until the cutover. The previous product (accounts,
> payments, 110 jurisdictions, v1 engine) is preserved on the branch `archive/pre-pareback`.

discover.legal is the website of a **legal-technology consultancy**. It sells four services: **Buy**
(independent selection), **Build** (client-owned software), **Run** (managed operation on the firm's
own infrastructure) and **Advise** (fractional technical leadership). Each has packages and a clear
next step; every price is "Price on request" until the owner sets numbers. It also shows two free
products as **demos**. **[S2-sample]** `/demo/biglaw` is a scripted sample walkthrough (typed data in
`content/samples/`, fictional matter, "Sample walkthrough … not legal advice … nothing is saved": matter →
task → findings with exact/tolerant/excluded badges → memo with an Evidence Note), plus `/work`
(honest status + consultancy, "Price on request").

1. **discover.legal Documents (Ontario)** **[docs-live]** `/demo/discover-legal` is the product's own
   editor (chat, Document Details, facts, paginated Petition/Decree preview; ported from the v1 app at
   `c34b131` into `components/demo/documents/`) on a **recorded engine**: visitors type, their words
   pick the nearest recorded turn (off-script → the recorded question again, with a note), facts fill in,
   the draft updates, and the two draft PDFs download at the end. No model call, no request, nothing
   saved; Reset clears it. `demo/documents/record.mjs` builds `recording.json` + `public/drafts/*.pdf`
   by running the real v1 Ontario interview code, templates and PDF renderer offline; the client's lines
   and the per-turn model output are scripted (no real-model Ontario run exists in git history).
2. **BigLaw** [planned: S7]. The open-source multi-agent platform, hosted separately at its own
   origin and embedded here in an iframe (a poster when no demo URL is set).

The site stores nothing about visitors: no accounts, no database, no payments, no forms, no file
uploads. The next step is a **booking link** (primary) with an **obfuscated email** as the fallback.
The one third party is optional analytics: Google Analytics 4 loads only when `NEXT_PUBLIC_GA_ID` is
set, and then Google sets its own cookies (see Limitations).

---

## What is on disk

```
app/                         Next.js App Router. Every route is prerendered (`npm run build` fails otherwise;
                             a `[param]` route passes only with `dynamicParams = false`).
  layout.tsx                 [S2-sample] root layout: tokens + Protocol, header nav, footer (#contact, spelled-out email); GA: S6
  page.tsx                   [S2-sample] / home: positioning, CTA, the two products, how we work
  work/page.tsx              [S2-sample] /work products with honest status, consultancy ("Price on request"), CTA
  demo/discover-legal/page.tsx  [docs-live] the playable Documents demo; demo/biglaw: [S2-sample] Stepper walkthrough
  sitemap.ts, robots.ts      [S2-sample] every route + allow only in the production build; else empty / Disallow: /
  not-found.tsx, icon.svg    [S1] 404 ("Page not found"), favicon
  services/page.tsx          [planned: S7] /services   packages ("Price on request"), pricing rules, FAQ
  documents/page.tsx         [planned: S6] /documents  framing, iframe, "for law firms" CTA
  documents/embed/page.tsx   [planned: S6] /documents/embed  the replay player (noindex; frameable by self, as /demo/** is)
  biglaw/page.tsx            [planned: S7] /biglaw     BigLaw demo iframe or poster; run-it-yourself / managed CTAs
  research/page.tsx          [planned: S7] /research   open experiments with their real status and repositories
  contact/page.tsx           [planned: S7] /contact    booking link first, obfuscated email second; works without JS
  privacy/page.tsx, terms/page.tsx   [planned: S7]
components/                  [S2-sample] Cta, Stepper, SampleView, useHydrated; [docs-live] demo/documents; [planned] PackageCard,
                             Analytics (GA4), DemoFrame, player/{Player,Transcript,Chips,Preview}
content/site.ts, samples/    [S2-sample] routes, nav, work, services (price null → "Price on request"), contact,
                             the two samples; [planned: S7] pricing.ts packages
styles/tokens.css            [S1] the 15 semantic tokens (colour, type, radius, shadow, status), light + dark
styles/directions/*.css      [S1] case-file, protocol, chambers: token overrides only (see "Visual direction")
styles/globals.css           [S1] element styles written only against tokens
core/                        [planned: S2/S3] the v2 engine, trimmed to the Ontario divorce interview, plus
                             intelligence/tape.ts (record/replay) and render/watermark.ts
demo/documents/               [docs-live] persona.mjs, record.mjs (owner-run), recording.json; public/drafts/ its PDFs
public/demo/                 [planned: S5] GENERATED, gitignored: tree.json, n/<node>.<kind>.html, preview.css, DEMO-*.pdf
__tests__/site/              [S1] loc-budget, tokens, lint-colour, deps, config, deploy, repo (Jest, node, no network)
e2e/smoke.spec.mjs           [planned: S9] Playwright smoke against the standalone server
scripts/                     [S1] loc-budget.mjs + loc-budgets.json (line gate), colour-literals.json (lint list),
                             smoke.mjs (HTTP smoke), standalone-assets.mjs (prerender check + static copy after build),
                             migrate.js (no-op for Render's old preDeployCommand; remove once the dashboard setting is cleared)
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
- `/demo/**` (S5's previews, framed by the S6 player; also the S2 sample pages) gets `frame-ancestors 'self'` and `SAMEORIGIN`; a
  preview links its CSS as a same-origin file, so `style-src` stays `'self'` everywhere.
- [planned: S6] `frame-src 'self' <BigLaw demo origin>`; `/documents/embed` gets `frame-ancestors 'self'`
  and `SAMEORIGIN`. Only when `NEXT_PUBLIC_GA_ID` matches `^G-[A-Z0-9]{4,16}$`: Google's GA4 origins
  (`*.googletagmanager.com` in `script-src`; it plus `*.google-analytics.com`, `*.analytics.google.com`
  in `connect-src` and `img-src`). Unset, no Google origin appears anywhere.

### Visual direction [S1; Protocol picked in S2-sample]
`styles/tokens.css` defines `--bg --surface --ink --muted --line --accent --accent-ink --ok --wait
--stop --shadow-raised` (light and dark) and `--font-display --font-body --radius-card
--radius-control`. Each direction file redeclares exactly that set on `:root` (light and
`prefers-color-scheme: dark`) and nothing else. **Protocol is picked** (the import in `app/layout.tsx`): verification-first, colour
only means status, which is what the samples show (verified/excluded badges, Draft notes); the other two
files stay until the owner confirms. Sources: `ui-directions/{a,b,c}.html`
(Case File, Protocol, Chambers); Protocol's light `--wait` is `#9c5800` (the source's is 4.31:1).
`tokens.test`: colour tokens are lowercase `#rrggbb`; WCAG AA (4.5:1) for every text pair, status colours
on both backgrounds, every file and scheme; 3:1 for the focus ring. `--line` is decorative only and not
contrast-tested. `globals.css` has no colour literal (`var()` fallbacks included) and takes type, radius
and shadow from tokens; CSS exists only in `styles/`; `app/icon.svg` uses light token values.
`lint-colour.test`: in `app/`, `components/` and `content/` ESLint bans every style sink (`style`,
`dangerouslySetInnerHTML`, `innerHTML`, `document.write`, `srcDoc`, `insertRule`, `replaceSync`,
`cssText`, `animate`, `attributeStyleMap`, `adoptedStyleSheets`, `<style>`, SVG `<animate>`/`<set>`, any
`text/css` string); colour slots (`fill`, `stroke`, any `*color`/`*Color` name, `<body text/link>`) take
only `none`, `currentColor`, `inherit`, `transparent`, `var(--token)` or `url(#id)`; no string is a hex or
colour-function value. CSS text that reaches no sink is inert and not scanned. A colour assembled at
runtime is not detected.

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
| `NEXT_PUBLIC_BOOKING_URL` | build | [S2-sample] Scheduler link (https only), the primary CTA "Book a call". Unset/invalid: "Email us" is primary, assembled in the browser (no-JS: `#contact`). |
| `NEXT_PUBLIC_GA_ID` | build | [planned: S6] GA4 ID (`G-…`). Unset: no analytics, no Google origin in the CSP. Never production's ID on a preview. |
| `NEXT_PUBLIC_BIGLAW_DEMO_URL` | build | [planned: S7] BigLaw demo origin to embed. Unset: /biglaw shows a poster; `frame-src` stays `'none'`. |
| `DEMO_LLM_API_KEY`, `DEMO_LLM_BASE_URL`, `DEMO_LLM_MODEL` | owner's machine | [planned: S4] `demo:record` only. Never set on Render. |

`NEXT_PUBLIC_*` values are inlined into public output at build time: never put a secret in one. Every
`.env*` file except `.env.example` is git- and docker-ignored (`repo.test`). The Dockerfile declares the
four public ones as `ARG`s; the site reads `NEXT_PUBLIC_SITE_URL` and `NEXT_PUBLIC_BOOKING_URL`.

### Line budgets [S1]
`npm run loc` counts every git-visible file except `package-lock.json` against
`scripts/loc-budgets.json` (total 14,447; PLAN.md "Line budget allocation" says which PR fills each
entry). A line ends at LF, CRLF, a lone CR, U+2028, U+2029 or NEL, and counts once per started 200 bytes, in every text type,
so one-line and minified files are charged for their size. The gate fails when: the budgets file is not
exactly `{total, maxFile, files, entries}` of positive integers; entries sum above the total; the total
or an entry is over budget, or an entry has none; a file is over 600 lines, or over its `files`
override, and never above the hard cap of **2,000** (in the script); a file is not UTF-8 text without
NUL and its extension is not binary (png jpg gif webp ico woff woff2 pdf: not counted, ≤ 1 MB; text is
counted whatever its extension); or a path is a symlink, a submodule or not a regular file.

### Test [S1]
- `npm test`: 8 suites in `__tests__/site/` (their `it` names state what each pins): `loc-budget`,
  `tokens`, `lint-colour`, `deps`, `config`, `deploy`, `repo`, `pages` (routes, sample disclosure, no form
  controls or literal email, CTA with/without booking URL, sitemap/robots). `scripts/smoke.mjs` also
  checks every route is 200 and prerendered and that every internal link on them resolves.
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

- **The BigLaw sample is scripted, not recorded**, and the Documents demo's replies are scripted from the
  product's Ontario interview questions (its drafts are real template output). Neither proves model quality. The email is spelled out in the footer
  ("h at discover dot legal") so it works without JavaScript; that is light obfuscation only.
- **Quality of the Documents demo is unproven** until one v2 recording passes the R0 lawyer checklist.
- **No live chat with the model.** The Documents demo answers only from its recording.
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
- **CI measured once on GitHub:** run 39008660437 (PR #351), `gates` 50 s, `image` 43 s, against 3-minute
  budgets. A PR run tests the merge result with its base. Dependabot starts only once its file is on `main`.
- **No private vulnerability channel yet.** `SECURITY.md` points at GitHub private vulnerability
  reporting, which was off on 2026-10-17; the owner enables it before C (PLAN P0/C).
- **Next.js error pages kept as is.** `/_global-error` and the static 500 page are Next's own: unbranded,
  and their inline styles are blocked by `style-src 'self'`, so a visitor who hits a server error sees
  it unstyled (CSP console errors). Any POST with a `Next-Action` header logs one error line (log noise).
- **Colour lint has known false positives:** a whole-string `#add`-like anchor (valid hex), a string or
  key that is exactly a sink name (`style`, `write`, `animate`, …), or copy containing `text/css`; rename it.
- **Unverified Render behaviour.** Blueprint sync, whether a sync drops a disk or domain render.yaml no
  longer lists, and any CDN in front are unverified (PLAN P0 answers them before S2 merges).
