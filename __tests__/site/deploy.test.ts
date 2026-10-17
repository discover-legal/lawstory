import { readFileSync } from 'node:fs';
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
      branch: 'main', dockerfilePath: './Dockerfile', healthCheckPath: '/api/health', autoDeploy: 'true', numInstances: '1' });
  });
  it('has no pre-deploy command, disk, database or cron', () => {
    expect(yaml).not.toMatch(/preDeployCommand|disk|databases|type: cron|startCommand/);
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
  it('runs on a pinned runner with Node from .nvmrc, once per change', () => {
    expect([...ci.matchAll(/runs-on: (\S+)/g)].map((m) => m[1])).toEqual(['ubuntu-24.04', 'ubuntu-24.04']);
    expect(ci).toMatch(/node-version-file: \.nvmrc/);
    expect(ci).not.toMatch(/node-version:/);
    expect(ci).toMatch(/group: ci-\$\{\{ github\.event\.pull_request\.number \|\| github\.ref \}\}/);
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
