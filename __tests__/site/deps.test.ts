import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(__dirname, '..', '..');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const lock = JSON.parse(readFileSync(join(root, 'package-lock.json'), 'utf8'));
const RUNTIME = ['next', 'react', 'react-dom'];

describe('dependencies', () => {
  it('runtime dependencies are exactly next, react and react-dom', () => {
    expect(Object.keys(pkg.dependencies).sort()).toEqual(RUNTIME);
  });

  it('declares no other runtime-installed dependency field', () => {
    for (const field of ['optionalDependencies', 'peerDependencies', 'bundleDependencies', 'bundledDependencies']) {
      expect(pkg[field]).toBeUndefined();
    }
  });

  it('pins every direct dependency to an exact version', () => {
    const all = { ...pkg.dependencies, ...pkg.devDependencies } as Record<string, string>;
    const loose = Object.entries(all).filter(([, v]) => !/^\d+\.\d+\.\d+$/.test(v));
    expect(loose).toEqual([]);
  });

  it('the lockfile agrees with package.json, in its root copy and in what it resolves', () => {
    expect(lock.packages[''].dependencies).toEqual(pkg.dependencies);
    expect(lock.packages[''].devDependencies).toEqual(pkg.devDependencies);
    const all = { ...pkg.dependencies, ...pkg.devDependencies } as Record<string, string>;
    const resolved = Object.fromEntries(Object.keys(all).map((n) => [n, lock.packages[`node_modules/${n}`]?.version]));
    expect(resolved).toEqual(all);
  });

  it('what npm installed is what package.json pins', () => {
    const all = { ...pkg.dependencies, ...pkg.devDependencies } as Record<string, string>;
    const installed = Object.fromEntries(Object.keys(all).map((n) =>
      [n, JSON.parse(readFileSync(join(root, 'node_modules', n, 'package.json'), 'utf8')).version]));
    expect(installed).toEqual(all);
  });

  it('every locked package comes from registry.npmjs.org with an integrity hash', () => {
    const entries = Object.entries(lock.packages as Record<string, { resolved?: string; integrity?: string; link?: boolean }>)
      .filter(([path, p]) => path !== '' && !p.link);
    expect(entries.length).toBeGreaterThan(100);
    const bad = entries.filter(([, p]) => !p.resolved?.startsWith('https://registry.npmjs.org/') || !p.integrity?.startsWith('sha512-'));
    expect(bad.map(([path]) => path)).toEqual([]);
  });
});
