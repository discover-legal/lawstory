import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

// Repository hygiene: secrets stay out of git and out of the Docker build context; pages exist.
const repo = join(__dirname, '..', '..');
const read = (f: string) => readFileSync(join(repo, f), 'utf8');
const gitIgnored = (p: string) => spawnSync('git', ['check-ignore', '-q', '--no-index', p], { cwd: repo }).status === 0;
const lines = (f: string) => read(f).split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));

describe('repository hygiene', () => {
  it.each(['.env', '.env.local', '.env.production', '.env.development', '.env.production.local'])('git ignores %s', (f) => {
    expect(gitIgnored(f)).toBe(true);
  });

  it('git keeps .env.example (the documented example) and the generated demo files are ignored', () => {
    expect(gitIgnored('.env.example')).toBe(false);
    expect(gitIgnored('public/demo/on-marcus/v1/tree.json')).toBe(true);
    expect(gitIgnored('public/demo/biglaw/index.html')).toBe(false); // the vendored BigLaw UI is committed
  });

  it('the Docker build context excludes every env file except the example, and host build output', () => {
    const rules = lines('.dockerignore');
    expect(rules).toEqual(expect.arrayContaining(['.env*', 'node_modules', '.next', '.git', 'public/demo/*']));
    expect(rules.indexOf('!public/demo/biglaw')).toBeGreaterThan(rules.indexOf('public/demo/*'));
    expect(rules.indexOf('!.env.example')).toBeGreaterThan(rules.indexOf('.env*'));
  });

  it('no env file other than the example is tracked', () => {
    const tracked = execFileSync('git', ['ls-files'], { cwd: repo, encoding: 'utf8' }).split('\n');
    expect(tracked.filter((f) => /(^|\/)\.env/.test(f) && !f.endsWith('.env.example'))).toEqual([]);
  });

  it('normalises line endings and marks binaries', () => {
    expect(lines('.gitattributes')).toEqual(expect.arrayContaining(['* text=auto eol=lf', '*.pdf binary', '*.png binary']));
  });

  it('every internal link in app/, components/ and content/ points at a page that exists', () => {
    const tsx = execFileSync('git', ['ls-files', '-co', '--exclude-standard', 'app', 'components', 'content'],
      { cwd: repo, encoding: 'utf8' }).split('\n').filter((f) => /\.tsx?$/.test(f));
    const hrefs = tsx.flatMap((f) => [...read(f).matchAll(/href(?:=["{]|: )["']?(\/[^"'#?}]*)/g)].map((m) => m[1]));
    expect(hrefs.length).toBeGreaterThan(0);
    const missing = hrefs.filter((h) => !existsSync(join(repo, 'app', h, 'page.tsx')) && !existsSync(join(repo, 'public', h, 'index.html')));
    expect(missing).toEqual([]);
  });

  it('the 404 page has its own title', () => {
    expect(read('app/not-found.tsx')).toMatch(/export const metadata: Metadata = \{ title: 'Page not found' \}/);
  });
});
