import { spawn, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Static checks of the deploy contract: render.yaml, the Dockerfile, .nvmrc and the CI workflow.
// (The image itself is exercised by the CI `image` job: non-root, read-only app files, smoke.)
const repo = join(__dirname, '..', '..');
const read = (f: string) => readFileSync(join(repo, f), 'utf8');
const nvmrc = read('.nvmrc').trim();
const docker = read('Dockerfile');
const ci = read('.github/workflows/ci.yml');

/** The few `key: value` scalars of render.yaml's single service (no YAML dependency). */
function renderService() {
  const yaml = read('render.yaml').replace(/#.*$/gm, '');
  expect(yaml.match(/^ {2}- type: (\w+)$/gm)).toEqual(['  - type: web']);
  const scalars = Object.fromEntries([...yaml.matchAll(/^ {4}(\w+): *(\S+)$/gm)].map((m) => [m[1], m[2]]));
  const env = [...yaml.matchAll(/- key: (\S+)\n\s+(value|sync): (\S+)/g)].map((m) => [m[1], m[2], m[3]]);
  return { yaml, scalars, env };
}

describe('render.yaml (production after cutover)', () => {
  const { yaml, scalars, env } = renderService();
  it('is one Docker web service that updates the existing production service in place', () => {
    expect(scalars).toEqual({ name: 'affidavit-maker', runtime: 'docker', plan: 'starter', region: 'oregon',
      branch: 'main', dockerfilePath: './Dockerfile', healthCheckPath: '/api/health', autoDeploy: 'true', numInstances: '1',
      maxShutdownDelaySeconds: '60' });
  });
  it('has no pre-deploy command, database or cron; a disk only as the old stanza PLAN C may restore until P2', () => {
    const OLD_DISK = '    disk:\n      name: affidavit-documents\n      mountPath: /app/documents\n      sizeGB: 10\n';
    expect(yaml.replace(OLD_DISK, '')).not.toMatch(/preDeployCommand|disk|databases|type: cron|startCommand/);
  });
  it('builds production as indexable and leaves the other public settings to the dashboard', () => {
    expect(env).toEqual([['NEXT_PUBLIC_SITE_URL', 'value', 'https://discover.legal'], ['NEXT_PUBLIC_BOOKING_URL', 'sync', 'false'],
      ['NEXT_PUBLIC_BIGLAW_DEMO_URL', 'sync', 'false'], ['NEXT_PUBLIC_GA_ID', 'sync', 'false']]);
  });
});

describe('Dockerfile', () => {
  it('builds and runs on the .nvmrc Node version (the single source)', () => {
    expect(nvmrc).toMatch(/^\d+\.\d+\.\d+$/);
    expect([...docker.matchAll(/^FROM (\S+)/gm)].map((m) => m[1])).toEqual([`node:${nvmrc}-bookworm-slim`, `node:${nvmrc}-bookworm-slim`]);
  });
  it('declares every public build setting as an ARG', () => {
    for (const v of ['NEXT_PUBLIC_SITE_URL', 'NEXT_PUBLIC_BOOKING_URL', 'NEXT_PUBLIC_BIGLAW_DEMO_URL', 'NEXT_PUBLIC_GA_ID']) {
      expect(docker).toMatch(new RegExp(`^ARG ${v}=""$`, 'm'));
    }
  });
  it('runs as node with root-owned app files, only .next/cache writable, and no entrypoint', () => {
    const run = docker.slice(docker.lastIndexOf('FROM '));
    expect(run).not.toMatch(/--chown/);
    expect([...run.matchAll(/chown (\S+) (\S+)/g)].map((m) => [m[1], m[2]])).toEqual([['node:node', '.next/cache']]);
    expect(run).toMatch(/^USER node$/m);
    expect(run.indexOf('USER node')).toBeLessThan(run.indexOf('CMD'));
    expect(run).toMatch(/^ENTRYPOINT \[\]$/m);
    expect(run).toMatch(/^CMD \["node", "server.js"\]$/m);
    expect(run).toMatch(/^COPY --from=build \/app\/.next\/standalone \.\/$/m);
  });
});

describe('CI workflow', () => {
  it('runs on a pinned runner with Node from .nvmrc in both jobs, once per change', () => {
    expect([...ci.matchAll(/runs-on: (\S+)/g)].map((m) => m[1])).toEqual(['ubuntu-24.04', 'ubuntu-24.04']);
    expect(ci.match(/node-version-file: \.nvmrc/g)).toHaveLength(2);
    expect(ci).not.toMatch(/node-version:/);
    expect(ci).toMatch(/group: ci-\$\{\{ github\.event\.pull_request\.number \|\| github\.ref \}\}/);
  });
  it('runs on pushes to main (production after cutover) and site-v6 and PRs into either; only PR runs cancel', () => {
    expect(ci).toMatch(/^on:\n {2}push:\n {4}branches: \[main, site-v6\]\n {2}pull_request:\n {4}branches: \[main, site-v6\]\n/m);
    expect(ci).toContain("cancel-in-progress: ${{ github.event_name == 'pull_request' }}");
  });
  it('lets smoke wait for the server instead of a fixed sleep', () => {
    expect(ci).not.toMatch(/sleep/);
  });
  it('Dependabot has no docker ecosystem (it cannot bump .nvmrc with the FROM lines)', () => {
    expect(read('.github/dependabot.yml')).not.toMatch(/package-ecosystem: docker/);
  });
  it('pins every action by commit SHA and drops checkout credentials', () => {
    const uses = [...ci.matchAll(/uses: (\S+)/g)].map((m) => m[1]);
    expect(uses.length).toBeGreaterThan(0);
    expect(uses.filter((u) => !/@[0-9a-f]{40}$/.test(u))).toEqual([]);
    const checkouts = uses.filter((u) => u.startsWith('actions/checkout@')).length;
    expect(ci.match(/persist-credentials: false/g)).toHaveLength(checkouts);
  });
  it('has every gate, the clean-tree check, the audit and the image job', () => {
    for (const step of ['npm ci', 'npm audit --omit=dev', 'npm run type-check', 'npm run lint', 'npm test', 'npm run loc',
      'npm run build', 'git status --porcelain', 'node scripts/smoke.mjs', 'docker build', 'timeout-minutes: 3']) {
      expect(ci).toContain(step);
    }
  });
});

describe('build helpers', () => {
  const node = (args: string[], env = {}) => new Promise<{ status: number | null; stderr: string }>((done) => {
    const c = spawn(process.execPath, args, { cwd: repo, env: { ...process.env, ...env } });
    let stderr = '';
    c.stderr.on('data', (d) => { stderr += d; });
    c.on('close', (status) => done({ status, stderr }));
  });

  it('smoke waits for a server that is still starting, and names an unreachable one', async () => {
    const srv = createServer((_, res) => res.end('x'));
    const port = 18220 + Math.floor(Math.random() * 10);
    const run = node([join(repo, 'scripts', 'smoke.mjs'), `http://127.0.0.1:${port}`], { SMOKE_WAIT_S: '5' });
    const listening = new Promise((up) => setTimeout(() => srv.listen(port, '127.0.0.1', () => up(null)), 1500));
    const late = await run;
    await listening;
    await new Promise((down) => srv.close(down));
    expect(late.stderr).not.toMatch(/not reachable/);
    expect(late.stderr).toMatch(/SMOKE FAIL: \/ CSP/); // it reached the server, which is not the site
    const none = await node([join(repo, 'scripts', 'smoke.mjs'), `http://127.0.0.1:${port}`], { SMOKE_WAIT_S: '1' });
    expect(none.status).toBe(1);
    expect(none.stderr).toMatch(/not reachable \(ECONNREFUSED\)/);
  }, 20_000);

  it('the build fails when any app route is not prerendered', () => {
    const dist = mkdtempSync(join(tmpdir(), 'dist-'));
    mkdirSync(join(dist, 'standalone'));
    mkdirSync(join(dist, 'static'));
    writeFileSync(join(dist, 'standalone', 'server.js'), '');
    const build = (routes: string[]) => {
      writeFileSync(join(dist, 'app-path-routes-manifest.json'), JSON.stringify({ '/page': '/', '/research/page': '/research' }));
      writeFileSync(join(dist, 'prerender-manifest.json'), JSON.stringify({ routes: Object.fromEntries(routes.map((r) => [r, {}])) }));
      return spawnSync(process.execPath, [join(repo, 'scripts', 'standalone-assets.mjs'), dist], { cwd: dist, encoding: 'utf8' });
    };
    const bad = build(['/']);
    expect(bad.status).toBe(1);
    expect(bad.stderr).toContain('not prerendered (every route must be static): /research');
    expect(build(['/', '/research']).status).toBe(0);
    rmSync(dist, { recursive: true, force: true });
  });
});
