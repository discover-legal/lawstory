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

  it('the lockfile agrees with package.json', () => {
    expect(lock.packages[''].dependencies).toEqual(pkg.dependencies);
    expect(lock.packages[''].devDependencies).toEqual(pkg.devDependencies);
  });
});
