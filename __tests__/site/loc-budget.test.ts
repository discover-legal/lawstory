import { spawnSync, execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

const repo = join(__dirname, '..', '..');
const script = join(repo, 'scripts', 'loc-budget.mjs');
const lines = (n: number) => 'x\n'.repeat(n);
const BUDGETS = { total: 35, maxFile: 10, files: { 'big/allowed.ts': 12 }, entries: { src: 15, big: 12, 'README.md': 5, '.gitignore': 2 } };

let dir: string;
function tree(files: Record<string, string | Buffer>) {
  dir = mkdtempSync(join(tmpdir(), 'loc-'));
  execFileSync('git', ['init', '-q'], { cwd: dir });
  for (const [p, body] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, p)), { recursive: true });
    writeFileSync(join(dir, p), body);
  }
  writeFileSync(join(dir, 'budgets.json'), JSON.stringify(BUDGETS));
  writeFileSync(join(dir, '.gitignore'), 'budgets.json\nignored/\n');
}
const run = (root = dir, extra = ['--budgets', join(dir, 'budgets.json')]) =>
  spawnSync(process.execPath, [script, root, ...extra], { encoding: 'utf8' });
const ok = { 'src/a.ts': lines(8), 'src/b.ts': lines(6), 'big/allowed.ts': lines(12), 'README.md': lines(3) };

afterEach(() => rmSync(dir, { recursive: true, force: true }));

describe('scripts/loc-budget.mjs', () => {
  it('exits 0 for an under-budget tree, ignoring the lockfile, binaries and gitignored files', () => {
    tree({ ...ok, 'package-lock.json': lines(500), 'src/logo.png': Buffer.from([0, 1, 10, 10, 10]), 'ignored/x.ts': lines(99) });
    const r = run();
    expect(r.stderr).toBe('');
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/^ *31 \/ +35 {2}TOTAL/m); // 8+6+12+3 (+2 .gitignore)
  });

  it('exits 1 and names the file when one file is over its budget', () => {
    tree({ ...ok, 'src/a.ts': lines(11), 'src/b.ts': lines(1) });
    const r = run();
    expect(r.status).toBe(1);
    expect(r.stderr).toContain('file src/a.ts: 11 lines > budget 10');
  });

  it('exits 1 and names the entry when a top-level entry is over budget', () => {
    tree({ ...ok, 'src/c.ts': lines(5) });
    const r = run();
    expect(r.status).toBe(1);
    expect(r.stderr).toContain('entry src: 19 lines > budget 15');
  });

  it('exits 1 for an entry with no budget, and for a total over budget', () => {
    tree({ ...ok, 'extra.ts': lines(9) });
    const r = run();
    expect(r.status).toBe(1);
    expect(r.stderr).toContain('entry extra.ts: 9 lines, no budget');
    expect(r.stderr).toMatch(/total: 40 lines > budget 35/);
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
