import { spawnSync, execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

const repo = join(__dirname, '..', '..');
const script = join(repo, 'scripts', 'loc-budget.mjs');
const lines = (n: number) => 'x\n'.repeat(n);
type Budgets = { total: number; maxFile: number; files: Record<string, number>; entries: Record<string, number> };
const BUDGETS: Budgets = { total: 35, maxFile: 10, files: { 'big/allowed.ts': 12 }, entries: { src: 15, big: 12, 'README.md': 5, '.gitignore': 2 } };

let dir: string;
function tree(files: Record<string, string | Buffer>, budgets: Budgets = BUDGETS) {
  if (dir) rmSync(dir, { recursive: true, force: true });
  dir = mkdtempSync(join(tmpdir(), 'loc-'));
  execFileSync('git', ['init', '-q'], { cwd: dir });
  for (const [p, body] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, p)), { recursive: true });
    writeFileSync(join(dir, p), body);
  }
  writeFileSync(join(dir, 'budgets.json'), JSON.stringify(budgets));
  writeFileSync(join(dir, '.gitignore'), 'budgets.json\nignored/\n');
}
const run = (root = dir, extra = ['--budgets', join(dir, 'budgets.json')]) =>
  spawnSync(process.execPath, [script, root, ...extra], { encoding: 'utf8' });
const ok = { 'src/a.ts': lines(8), 'src/b.ts': lines(6), 'big/allowed.ts': lines(12), 'README.md': lines(3) };
const failsWith = (msg: string | RegExp) => {
  const r = run();
  expect(r.status).toBe(1);
  if (typeof msg === 'string') expect(r.stderr).toContain(msg); else expect(r.stderr).toMatch(msg);
};

afterEach(() => rmSync(dir, { recursive: true, force: true }));

describe('scripts/loc-budget.mjs', () => {
  it('exits 0 for an under-budget tree, ignoring the lockfile, binaries (by extension) and gitignored files', () => {
    tree({ ...ok, 'package-lock.json': lines(500), 'src/logo.png': Buffer.from([0, 1, 10, 10, 10]), 'ignored/x.ts': lines(99) });
    const r = run();
    expect(r.stderr).toBe('');
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/^ *31 \/ +35 {2}TOTAL/m); // 8+6+12+3 (+2 .gitignore)
  });

  it('exits 1 and names the file when one file is over its budget', () => {
    tree({ ...ok, 'src/a.ts': lines(11), 'src/b.ts': lines(1) });
    failsWith('file src/a.ts: 11 lines > budget 10');
  });

  it.each(['a.tsx', 'a.mjs', 'a.js', 'a.css', 'a.json', 'a.jsonl', 'a.md', 'a.yml', 'a.svg', 'a.html', 'a.txt', 'Dockerfile'])(
    'counts every text type: src/%s over the per-file cap fails', (name) => {
      tree({ ...ok, 'src/a.ts': lines(1), 'src/b.ts': lines(1), [`src/${name}`]: lines(11) });
      failsWith(`file src/${name}: 11 lines > budget 10`);
    });

  it('counts a last line without a newline, and caps bytes so a one-line file cannot dodge', () => {
    tree({ ...ok, 'src/b.ts': 'x\n'.repeat(5) + 'y' });
    expect(run().stdout).toMatch(/^ *14 \/ +15 {2}src/m);
    tree({ ...ok, 'src/min.json': 'x'.repeat(1001) }); // cap 10 lines -> 1,000 bytes
    failsWith('file src/min.json: 1001 bytes > byte cap 1000');
  });

  it('fails a code line over 200 bytes (minified code), but allows one in data', () => {
    tree({ ...ok, 'src/b.ts': `${'y'.repeat(201)}\n` });
    failsWith('file src/b.ts: a 201-byte line > 200 (code)');
    tree({ ...ok, 'src/b.json': `${'y'.repeat(201)}\n` });
    expect(run().status).toBe(0);
  });

  it.each([
    ['a NUL byte in a .ts file', 'src/nul.ts', Buffer.from('//\0\nexport const x = 1;\n')],
    ['UTF-16 text', 'src/utf16.md', Buffer.from('﻿line\n'.repeat(3), 'utf16le')],
    ['an unknown binary', 'src/blob.bin', Buffer.from([0xff, 0xfe, 0, 1])],
  ])('fails %s instead of skipping it as binary', (_, path, body) => {
    tree({ ...ok, [path]: body });
    failsWith(`file ${path}: not UTF-8 text`);
  });

  it('fails a submodule, a symlink and a nested repository; skips only a file deleted from the worktree', () => {
    tree(ok);
    execFileSync('git', ['update-index', '--add', '--cacheinfo', `160000,${'a'.repeat(40)},vendored`], { cwd: dir });
    symlinkSync('src/a.ts', join(dir, 'link.ts'));
    mkdirSync(join(dir, 'nested'));
    execFileSync('git', ['init', '-q'], { cwd: join(dir, 'nested') });
    writeFileSync(join(dir, 'nested', 'big.ts'), lines(50));
    const r = run();
    expect(r.status).toBe(1);
    expect(r.stderr).toContain('file vendored: git submodule');
    expect(r.stderr).toContain('file link.ts: symlink');
    expect(r.stderr).toContain('file nested/: not a regular file');
    tree(ok);
    execFileSync('git', ['add', '-A'], { cwd: dir });
    unlinkSync(join(dir, 'src', 'b.ts'));
    expect(run().status).toBe(0);
  });

  it('no override can raise a file above 2,000 lines', () => {
    const big = { total: 9000, maxFile: 600, files: { 'src/tape.jsonl': 2500, 'src/ok.json': 2000 }, entries: { src: 8000, '.gitignore': 2 } };
    tree({ 'src/tape.jsonl': lines(10), 'src/ok.json': lines(2001) }, big);
    const r = run();
    expect(r.status).toBe(1);
    expect(r.stderr).toContain('override src/tape.jsonl: 2500 > hard cap 2000');
    expect(r.stderr).toContain('file src/ok.json: 2001 lines > budget 2000');
    tree({ 'src/a.ts': lines(1) }, { ...big, maxFile: 2001, files: {} });
    failsWith('maxFile 2001 > hard cap 2000');
  });

  it('exits 1 and names the entry when a top-level entry is over budget', () => {
    tree({ ...ok, 'src/c.ts': lines(5) });
    failsWith('entry src: 19 lines > budget 15');
  });

  it('exits 1 for an entry with no budget, for a total over budget, and for entries summing over the total', () => {
    tree({ ...ok, 'extra.ts': lines(9) });
    failsWith('entry extra.ts: 9 lines, no budget');
    failsWith(/total: 40 lines > budget 35/);
    tree(ok, { ...BUDGETS, entries: { ...BUDGETS.entries, src: 17 } });
    failsWith('entry budgets sum to 36 > total 35');
  });

  it('counts untracked files that are not ignored (a new file cannot dodge the gate)', () => {
    tree(ok);
    writeFileSync(join(dir, 'src', 'new.ts'), lines(4));
    expect(run().stderr).toContain('entry src: 18 lines > budget 15');
  });

  it('passes on this repository with the default budgets', () => {
    dir = mkdtempSync(join(tmpdir(), 'loc-')); // nothing to build; afterEach cleans it
    const r = run(repo, []);
    expect(r.stderr).toBe('');
    expect(r.status).toBe(0);
  });
});

describe('scripts/loc-budgets.json (the plan, S1–S10 and the cutover)', () => {
  const b: Budgets = JSON.parse(readFileSync(join(repo, 'scripts', 'loc-budgets.json'), 'utf8'));
  // Every path PLAN.md says a later PR or the cutover adds. Each needs an entry budget now.
  const PLANNED = ['core/clock.ts', 'core/data/ontario.json', 'core/intelligence/tape.ts', 'core/render/watermark.ts',
    'demo/record.ts', 'demo/personas/on-marcus.json', 'demo/fixtures/on-marcus/v1/tape.jsonl', '__tests__/fixtures/demo-mini/tape.jsonl',
    '__tests__/core/tape.test.ts', 'evidence/ontario.profile.json', 'docs/spec/03-documents-and-rendering.md', 'docs/r0-review/checklist.md',
    'components/player/Player.tsx', 'components/Analytics.tsx', 'content/pricing.ts', 'app/documents/embed/page.tsx', 'app/sitemap.ts',
    'e2e/smoke.spec.mjs', 'tools/loc.py', 'purge-log.md', 'public/favicon.svg', '.env.example'];

  it('the total is the design ceiling and the entries fit inside it', () => {
    expect(b.total).toBe(14447);
    expect(Object.values(b.entries).reduce((x, y) => x + y, 0)).toBeLessThanOrEqual(b.total);
    expect(b.maxFile).toBeLessThanOrEqual(2000);
  });

  it('every planned path has an entry budget', () => {
    expect(PLANNED.map((p) => p.split('/')[0]).filter((e) => !(e in b.entries))).toEqual([]);
  });
});
