#!/usr/bin/env node
// Line budgets (CI gate). Counts newlines in every git-visible text file (tracked, plus untracked
// files that are not ignored), skipping package-lock.json and binary files (NUL in the first 8 KB),
// the same rule as the design's tools/loc.py. Fails (exit 1) when the total, a top-level entry, or a
// single file is over budget, or when a top-level entry has no budget. Ceilings come from the
// design's tools/port_manifest.py. Usage: node scripts/loc-budget.mjs [root] [--budgets file.json]
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const DEFAULT = {
  total: 14447,
  maxFile: 600, // the largest ported file, core/interview/engine.ts, is 587 lines
  files: {},
  entries: {
    core: 5541, __tests__: 4563, app: 967, components: 785, demo: 580, docs: 476, content: 420,
    styles: 300, 'README.md': 200, e2e: 120, 'CLAUDE.md': 80, 'next.config.mjs': 70, '.github': 60,
    scripts: 60, 'package.json': 45, Dockerfile: 35, 'tsconfig.json': 30, 'render.yaml': 30,
    'jest.config.js': 25, 'eslint.config.mjs': 20, '.gitignore': 20, '.env.example': 20, '.dockerignore': 15,
  },
};

const args = process.argv.slice(2);
const bi = args.indexOf('--budgets');
const budgets = bi >= 0 ? JSON.parse(readFileSync(args.splice(bi, 2)[1], 'utf8')) : DEFAULT;
const root = resolve(args[0] ?? '.');

const listed = execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], { cwd: root });
const paths = [...new Set(listed.toString('utf8').split('\0').filter(Boolean))].filter((p) => p !== 'package-lock.json');

const byEntry = new Map(); const errors = []; let total = 0;
for (const p of paths) {
  let buf;
  try { buf = readFileSync(join(root, p)); } catch { continue; } // deleted but still in the index
  if (buf.subarray(0, 8192).includes(0)) continue;
  let n = 0; for (const b of buf) if (b === 10) n++;
  total += n;
  const entry = p.split('/')[0];
  byEntry.set(entry, (byEntry.get(entry) ?? 0) + n);
  const cap = budgets.files?.[p] ?? budgets.maxFile;
  if (n > cap) errors.push(`file ${p}: ${n} lines > budget ${cap}`);
}
for (const [entry, n] of [...byEntry].sort((a, b) => b[1] - a[1])) {
  const cap = budgets.entries[entry];
  if (cap === undefined) errors.push(`entry ${entry}: ${n} lines, no budget (add it to scripts/loc-budget.mjs)`);
  else if (n > cap) errors.push(`entry ${entry}: ${n} lines > budget ${cap}`);
  console.log(`${String(n).padStart(7)} / ${String(cap ?? '-').padStart(5)}  ${entry}`);
}
if (total > budgets.total) errors.push(`total: ${total} lines > budget ${budgets.total}`);
console.log(`${String(total).padStart(7)} / ${String(budgets.total).padStart(5)}  TOTAL (excl. package-lock.json)`);
for (const e of errors) console.error(`LOC BUDGET: ${e}`);
process.exit(errors.length ? 1 : 0);
