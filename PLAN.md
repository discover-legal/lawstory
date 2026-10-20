# PLAN

- site-restore (2026-10-20): the pre-v6 marketing look is back (Tailwind 3 + PostCSS as devDependencies, build-time only); loc-budgets.json moves 35 lines from `core` (4890 → 4855) to new entries `tailwind.config.ts` 25, `postcss.config.mjs` 5, `PLAN.md` 5; total unchanged. Colours live in tailwind.config.ts (outside the lint scope), so colour-literals.json and the no-inline-style rule are unchanged.
