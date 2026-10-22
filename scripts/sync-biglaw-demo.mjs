// Vendors the playable BigLaw UI (a recorded engine, no network) into public/demo/biglaw/, served at
// /demo/biglaw (next.config.mjs rewrite). Builds it in a BigLaw checkout with `make demo-bundle` (Vite,
// base /demo/biglaw/, then BigLaw's own no-network check), replaces the vendored copy and writes VERSION.
// Usage: node scripts/sync-biglaw-demo.mjs <path to BigLaw checkout> [--no-build]
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const [src, flag] = process.argv.slice(2);
if (!src) { console.error('usage: node scripts/sync-biglaw-demo.mjs <BigLaw checkout> [--no-build]'); process.exit(2); }
const root = resolve(src);
const run = (cmd, args) => execFileSync(cmd, args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] }).trim();
if (flag !== '--no-build') execFileSync('make', ['demo-bundle'], { cwd: root, stdio: 'inherit' });
const dist = join(root, 'ui', 'dist-recorded');
const html = readFileSync(join(dist, 'index.html'), 'utf8');
if (!html.includes('/demo/biglaw/assets/')) throw new Error(`${dist} was not built for base /demo/biglaw/`);
const out = resolve('public', 'demo', 'biglaw');
rmSync(out, { recursive: true, force: true });
cpSync(dist, out, { recursive: true });
const sha = run('git', ['rev-parse', 'HEAD']);
const dirty = run('git', ['status', '--porcelain', '--', 'ui']) ? ' (ui/ had uncommitted changes)' : '';
writeFileSync(join(out, 'VERSION'), `BigLaw ${sha}${dirty}\n${run('git', ['log', '-1', '--format=%s'])}\n`);
console.log(`public/demo/biglaw <- ${dist} @ ${sha.slice(0, 7)}${dirty}`);
if (!existsSync(join(out, 'index.html'))) process.exit(1);
