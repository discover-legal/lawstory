#!/usr/bin/env node
// Line budgets (CI gate). Every git-visible file (tracked, plus untracked files that are not ignored)
// except package-lock.json is checked. Usage: node scripts/loc-budget.mjs [root] [--budgets file.json]
//  - The budgets file must be exactly { total, maxFile, files: {path: n}, entries: {entry: n} } (plus
//    `_comment`) of positive integers; anything else fails before a file is read. No value can raise a
//    file above HARD_MAX_LINES.
//  - UTF-8 text without NUL is counted whatever its extension (a tape renamed .pdf is still text). Other
//    content fails unless the extension is in BINARY: then it is not counted, but capped at BINARY_MAX_BYTES.
//  - A line ends at LF, CRLF or a lone CR; an unterminated last line counts. Each line counts once per
//    started LINE_BYTES bytes, so a long-line or one-line file is charged for its size, in every type.
//  - Symlinks, submodules and anything else that is not a regular file fail; only ENOENT (deleted but
//    still in the index) is skipped.
import { execFileSync } from 'node:child_process';
import { lstatSync, readFileSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';

const HARD_MAX_LINES = 2000;
const LINE_BYTES = 200;
const BINARY = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.woff', '.woff2', '.pdf']);
const BINARY_MAX_BYTES = 1_000_000;

const args = process.argv.slice(2);
const bi = args.indexOf('--budgets');
const budgetsFile = bi >= 0 ? args.splice(bi, 2)[1] : new URL('./loc-budgets.json', import.meta.url);
const root = resolve(args[0] ?? '.');
const errors = [];
const fail = () => { for (const e of errors) console.error(`LOC BUDGET: ${e}`); process.exit(1); };

let budgets;
try { budgets = JSON.parse(readFileSync(budgetsFile, 'utf8')); } catch (e) { errors.push(`budgets file: ${e.message}`); fail(); }
const posInt = (v) => Number.isInteger(v) && v > 0;
const own = (o, k) => (Object.hasOwn(o, k) ? o[k] : undefined); // never Object.prototype's keys
const isMap = (v) => typeof v === 'object' && v !== null && !Array.isArray(v);
if (!isMap(budgets)) { errors.push('budgets file: not a JSON object'); fail(); }
for (const k of Object.keys(budgets)) if (!['_comment', 'total', 'maxFile', 'files', 'entries'].includes(k)) errors.push(`budgets: unknown key "${k}"`);
for (const k of ['total', 'maxFile']) if (!posInt(budgets[k])) errors.push(`budgets.${k}: ${JSON.stringify(budgets[k])} is not a positive integer`);
for (const k of ['files', 'entries']) {
  if (!isMap(budgets[k])) { errors.push(`budgets.${k}: not an object`); continue; }
  for (const [p, n] of Object.entries(budgets[k])) if (!posInt(n)) errors.push(`budgets.${k}["${p}"]: ${JSON.stringify(n)} is not a positive integer`);
}
if (budgets.maxFile > HARD_MAX_LINES) errors.push(`maxFile ${budgets.maxFile} > hard cap ${HARD_MAX_LINES}`);
for (const [p, n] of Object.entries(isMap(budgets.files) ? budgets.files : {})) {
  if (n > HARD_MAX_LINES) errors.push(`override ${p}: ${n} > hard cap ${HARD_MAX_LINES} (no override can raise it)`);
}
if (errors.length) fail();
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
  let text;
  try { text = utf8.decode(buf); } catch { text = null; }
  if (text === null || text.includes('\0')) {
    if (!BINARY.has(extname(p).toLowerCase())) errors.push(`file ${p}: not UTF-8 text (binary types by extension only: ${[...BINARY].join(' ')})`);
    else if (buf.length > BINARY_MAX_BYTES) errors.push(`file ${p}: ${buf.length} bytes > binary cap ${BINARY_MAX_BYTES}`);
    continue;
  }
  const lines = text.split(/\r\n|\r|\n/);
  if (lines.at(-1) === '') lines.pop();
  const n = lines.reduce((s, l) => s + Math.max(1, Math.ceil(Buffer.byteLength(l) / LINE_BYTES)), 0);
  total += n;
  const entry = p.split('/')[0];
  byEntry.set(entry, (byEntry.get(entry) ?? 0) + n);
  const cap = Math.min(own(budgets.files, p) ?? budgets.maxFile, HARD_MAX_LINES);
  if (n > cap) errors.push(`file ${p}: ${n} lines > budget ${cap}`);
}
for (const [entry, n] of [...byEntry].sort((a, b) => b[1] - a[1])) {
  const cap = own(budgets.entries, entry);
  if (cap === undefined) errors.push(`entry ${entry}: ${n} lines, no budget (add it to scripts/loc-budgets.json)`);
  else if (n > cap) errors.push(`entry ${entry}: ${n} lines > budget ${cap}`);
  console.log(`${String(n).padStart(7)} / ${String(cap ?? '-').padStart(5)}  ${entry}`);
}
if (total > budgets.total) errors.push(`total: ${total} lines > budget ${budgets.total}`);
console.log(`${String(total).padStart(7)} / ${String(budgets.total).padStart(5)}  TOTAL (excl. package-lock.json)`);
if (errors.length) fail();
