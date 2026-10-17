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

  it('counts a last line without a newline; LF, CRLF and a lone CR each end a line', () => {
    tree({ ...ok, 'src/b.ts': 'x\n'.repeat(5) + 'y' });
    expect(run().stdout).toMatch(/^ *14 \/ +15 {2}src/m);
    tree({ ...ok, 'src/b.ts': 'x\r\n'.repeat(6) });
    expect(run().stdout).toMatch(/^ *14 \/ +15 {2}src/m);
    tree({ ...ok, 'src/notes.md': 'x\r'.repeat(11) }); // a CR-only file is 11 lines, not 1
    failsWith('file src/notes.md: 11 lines > budget 10');
    for (const sep of ['\u2028', '\u2029', '\u0085']) { // JS line terminators (and NEL) end a line too
      tree({ ...ok, 'src/sep.js': 'x=1;'.concat(sep).repeat(11) });
      failsWith('file src/sep.js: 11 lines > budget 10');
    }
  });

  it.each(['b.ts', 'b.json', 'b.py', 'b.md', 'b.svg', 'b.yml', 'b.css'])(
    'charges a long line in src/%s once per started 200 bytes', (name) => {
      tree({ ...ok, 'src/b.ts': lines(1), [`src/${name}`]: `${'y'.repeat(200)}\n${'y'.repeat(201)}\n${'y'.repeat(1801)}` });
      failsWith(`file src/${name}: 13 lines > budget 10`); // 1 + 2 + 10
    });

  it('with the real budgets, one-line data and code are charged for their size (2.4 MB of JSON cannot be 40 lines)', () => {
    const real = join(repo, 'scripts', 'loc-budgets.json');
    tree({ 'tools/loc.py': `import sys;${Array.from({ length: 5000 }, (_, i) => `x${i}=${i}`).join(';')}\n` });
    const py = run(dir, ['--budgets', real]);
    expect(py.status).toBe(1);
    expect(py.stderr).toMatch(/entry tools: \d{3} lines > budget 20/);
    const blobs = Object.fromEntries(Array.from({ length: 40 }, (_, k) => [`content/blob${k}.json`, `{"k":"${'y'.repeat(59000)}"}\n`]));
    tree(blobs);
    const json = run(dir, ['--budgets', real]);
    expect(json.stdout).toMatch(/^ *11840 \/ +\d+ {2}content/m); // 40 x ceil(59,010 / 200)
    expect(json.stderr).toMatch(/entry content: 11840 lines > budget/);
  });

  it('a one-line file over 400,000 bytes breaks the 2,000-line hard cap whatever its override', () => {
    tree({ 'src/tape.jsonl': 'y'.repeat(400_001) }, { total: 9000, maxFile: 600, files: { 'src/tape.jsonl': 2000 }, entries: { src: 8000, '.gitignore': 2 } });
    failsWith('file src/tape.jsonl: 2001 lines > budget 2000');
  });

  it('a path named like an Object.prototype key gets the default cap, not a function', () => {
    tree({ ...ok, 'src/a.ts': lines(1), 'src/b.ts': lines(1), constructor: lines(11), toString: lines(1) });
    const r = run();
    expect(r.status).toBe(1);
    expect(r.stderr).toContain('file constructor: 11 lines > budget 10');
    expect(r.stderr).toContain('entry constructor: 11 lines, no budget');
    expect(r.stderr).toContain('entry toString: 1 lines, no budget');
  });

  it.each([
    ['a NUL byte in a .ts file', 'src/nul.ts', Buffer.from('//\0\nexport const x = 1;\n')],
    ['UTF-16 text', 'src/utf16.md', Buffer.from('﻿line\n'.repeat(3), 'utf16le')],
    ['an unknown binary', 'src/blob.bin', Buffer.from([0xff, 0xfe, 0, 1])],
    ['Latin-1 text without a NUL', 'src/latin1.md', Buffer.from('caf\xe9\n', 'latin1')],
  ])('fails %s instead of skipping it as binary', (_, path, body) => {
    tree({ ...ok, [path]: body });
    failsWith(`file ${path}: not UTF-8 text`);
  });

  it('counts a text file that wears a binary extension, and caps a real binary at 1 MB', () => {
    tree({ ...ok, 'src/tape.pdf': lines(11) });
    failsWith('file src/tape.pdf: 11 lines > budget 10');
    tree({ ...ok, 'src/huge.png': Buffer.concat([Buffer.from([0x89, 0, 0xff]), Buffer.alloc(1_000_000)]) });
    failsWith('file src/huge.png: 1000003 bytes > binary cap 1000000');
    tree({ ...ok, 'src/LOGO.PNG': Buffer.from([0x89, 0, 0xff]) }); // extensions match in any case
    expect(run().status).toBe(0);
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
    tree({ 'src/tape.jsonl': lines(10) }, big);
    failsWith('override src/tape.jsonl: 2500 > hard cap 2000');
    tree({ 'src/ok.json': lines(2001) }, { ...big, files: { 'src/ok.json': 2000 } });
    failsWith('file src/ok.json: 2001 lines > budget 2000');
    tree({ 'src/a.ts': lines(1) }, { ...big, maxFile: 2001, files: {} });
    failsWith('maxFile 2001 > hard cap 2000');
  });

  const BAD_BUDGETS: [string, unknown, string][] = [
    ['missing maxFile', { total: 35, files: {}, entries: { src: 15 } }, 'budgets.maxFile: undefined is not a positive integer'],
    ['typo key', { total: 35, maxfile: 10, files: {}, entries: { src: 15 } }, 'budgets: unknown key "maxfile"'],
    ['string override', { ...BUDGETS, files: { 'src/a.ts': 'lots' } }, 'budgets.files["src/a.ts"]: "lots" is not a positive integer'],
    ['string entry', { ...BUDGETS, entries: { ...BUDGETS.entries, src: '15' } }, 'budgets.entries["src"]: "15" is not a positive integer'],
    ['missing total', { maxFile: 10, files: {}, entries: { src: 15 } }, 'budgets.total: undefined is not a positive integer'],
    ['zero', { ...BUDGETS, maxFile: 0 }, 'budgets.maxFile: 0 is not a positive integer'],
    ['fractional', { ...BUDGETS, total: 35.5 }, 'budgets.total: 35.5 is not a positive integer'],
    ['missing files map', { total: 35, maxFile: 10, entries: { src: 15 } }, 'budgets.files: not an object'],
    ['an array', [1, 2], 'budgets file: not a JSON object'],
  ];
  it.each(BAD_BUDGETS)('fails before counting when the budgets file is invalid: %s', (_, budgets, msg) => {
    tree({ ...ok, 'src/a.ts': lines(5000) }, budgets as Budgets);
    const r = run();
    expect(r.status).toBe(1);
    expect(r.stderr).toContain(msg);
    expect(r.stdout).toBe(''); // nothing was counted against a broken budget
  });

  it('fails on a budgets file that is not JSON or does not exist', () => {
    tree(ok);
    writeFileSync(join(dir, 'budgets.json'), '{"total": 35,');
    failsWith(/budgets file: .*JSON/);
    expect(run(dir, ['--budgets', join(dir, 'nope.json')]).stderr).toMatch(/budgets file: ENOENT/);
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
