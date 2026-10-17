#!/usr/bin/env node
// Line budgets (CI gate). Every git-visible file (tracked, plus untracked files that are not ignored)
// except package-lock.json is checked. Usage: node scripts/loc-budget.mjs [root] [--budgets file.json]
//  - Binary is decided by extension (BINARY); such a file is not counted but has a byte cap. Any other
//    file must be UTF-8 text with no NUL byte, or the gate fails (no "looks binary" dodge).
//  - Lines = newlines, plus 1 for a last line without one (the same rule as the design's tools/loc.py,
//    which never counts more). Fails when the total, a top-level entry or a file is over budget, or an
//    entry has no budget.
//  - Per file: lines <= cap and bytes <= cap * BYTES_PER_LINE, where cap = the file's override or
//    maxFile, and never above HARD_MAX_LINES, which no budget file can raise. Code lines <= MAX_LINE_BYTES.
//  - Symlinks, submodules and anything else that is not a regular file fail; only ENOENT (deleted but
//    still in the index) is skipped.
import { execFileSync } from 'node:child_process';
import { lstatSync, readFileSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';

const HARD_MAX_LINES = 2000;
const BYTES_PER_LINE = 100;
const MAX_LINE_BYTES = 200;
const BINARY = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.woff', '.woff2', '.pdf']);
const BINARY_MAX_BYTES = 1_000_000;
const CODE = /\.(?:[cm]?[jt]sx?|css)$/;

const args = process.argv.slice(2);
const bi = args.indexOf('--budgets');
const budgetsFile = bi >= 0 ? args.splice(bi, 2)[1] : new URL('./loc-budgets.json', import.meta.url);
const budgets = JSON.parse(readFileSync(budgetsFile, 'utf8'));
const root = resolve(args[0] ?? '.');
const errors = [];

if (budgets.maxFile > HARD_MAX_LINES) errors.push(`maxFile ${budgets.maxFile} > hard cap ${HARD_MAX_LINES}`);
for (const [p, n] of Object.entries(budgets.files ?? {})) {
  if (n > HARD_MAX_LINES) errors.push(`override ${p}: ${n} > hard cap ${HARD_MAX_LINES} (no override can raise it)`);
}
const entrySum = Object.values(budgets.entries).reduce((a, b) => a + b, 0);
if (entrySum > budgets.total) errors.push(`entry budgets sum to ${entrySum} > total ${budgets.total}`);

const git = (...a) => execFileSync('git', a, { cwd: root, maxBuffer: 64 << 20 }).toString('utf8').split('\0').filter(Boolean);
const mode = new Map(git('ls-files', '-s', '-z').map((l) => [l.slice(l.indexOf('\t') + 1), l.split(' ')[0]]));
const paths = [...new Set([...mode.keys(), ...git('ls-files', '-z', '--others', '--exclude-standard')])]
  .filter((p) => p !== 'package-lock.json');

const utf8 = new TextDecoder('utf-8', { fatal: true });
const byEntry = new Map(); let total = 0;
for (const p of paths) {
  if (mode.get(p) === '160000') { errors.push(`file ${p}: git submodule (not allowed)`); continue; }
  let st;
  try { st = lstatSync(join(root, p)); } catch (e) { if (e.code === 'ENOENT') continue; errors.push(`file ${p}: ${e.code}`); continue; }
  if (!st.isFile()) { errors.push(`file ${p}: ${st.isSymbolicLink() ? 'symlink' : 'not a regular file'} (not allowed)`); continue; }
  const buf = readFileSync(join(root, p));
  if (BINARY.has(extname(p).toLowerCase())) {
    if (buf.length > BINARY_MAX_BYTES) errors.push(`file ${p}: ${buf.length} bytes > binary cap ${BINARY_MAX_BYTES}`);
    continue;
  }
  let text;
  try { text = utf8.decode(buf); } catch { text = null; }
  if (text === null || text.includes('\0')) {
    errors.push(`file ${p}: not UTF-8 text (binary types by extension only: ${[...BINARY].join(' ')})`); continue;
  }
  const lines = text.split('\n');
  const n = lines.length - 1 + (lines.at(-1) === '' ? 0 : 1);
  total += n;
  const entry = p.split('/')[0];
  byEntry.set(entry, (byEntry.get(entry) ?? 0) + n);
  const cap = (budgets.files?.[p] ?? budgets.maxFile);
  if (n > cap) errors.push(`file ${p}: ${n} lines > budget ${cap}`);
  if (buf.length > cap * BYTES_PER_LINE) errors.push(`file ${p}: ${buf.length} bytes > byte cap ${cap * BYTES_PER_LINE}`);
  const longest = CODE.test(p) ? Math.max(...lines.map((l) => Buffer.byteLength(l))) : 0;
  if (longest > MAX_LINE_BYTES) errors.push(`file ${p}: a ${longest}-byte line > ${MAX_LINE_BYTES} (code)`);
}
for (const [entry, n] of [...byEntry].sort((a, b) => b[1] - a[1])) {
  const cap = budgets.entries[entry];
  if (cap === undefined) errors.push(`entry ${entry}: ${n} lines, no budget (add it to scripts/loc-budgets.json)`);
  else if (n > cap) errors.push(`entry ${entry}: ${n} lines > budget ${cap}`);
  console.log(`${String(n).padStart(7)} / ${String(cap ?? '-').padStart(5)}  ${entry}`);
}
if (total > budgets.total) errors.push(`total: ${total} lines > budget ${budgets.total}`);
console.log(`${String(total).padStart(7)} / ${String(budgets.total).padStart(5)}  TOTAL (excl. package-lock.json)`);
for (const e of errors) console.error(`LOC BUDGET: ${e}`);
process.exit(errors.length ? 1 : 0);
