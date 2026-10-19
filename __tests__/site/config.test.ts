import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

// Loads next.config.mjs in a child process (it is ESM and reads the environment at import time)
// and returns the config with headers() and rewrites() resolved.
const repo = join(__dirname, '..', '..');
const LOADER = `const m = await import(process.argv[1]); const c = m.default;
console.log(JSON.stringify({ ...c, headers: await c.headers(), rewrites: await c.rewrites() }));`;
type Rule = { source: string; headers: { key: string; value: string }[] };
type Config = Record<string, unknown> & { headers: Rule[]; rewrites: { source: string; destination: string }[] };
function load(env: { NODE_ENV?: 'production' | 'development'; NEXT_PUBLIC_SITE_URL?: string }): Config {
  const r = spawnSync(process.execPath, ['--input-type=module', '-e', LOADER, join(repo, 'next.config.mjs')],
    { cwd: repo, encoding: 'utf8', env: { NODE_ENV: 'production', PATH: process.env.PATH ?? '', ...env } });
  if (r.status !== 0) throw new Error(r.stderr);
  return JSON.parse(r.stdout);
}
const header = (c: Config, path: string, key: string) =>
  c.headers.filter((r) => new RegExp(`^${r.source.replace(':path*', '.*')}$`).test(path))
    .flatMap((r) => r.headers).filter((h) => h.key === key).map((h) => h.value);
const directives = (csp: string) => new Map(csp.split('; ').map((d) => [d.split(' ')[0], d.split(' ').slice(1).join(' ')]));

const prod = load({ NODE_ENV: 'production', NEXT_PUBLIC_SITE_URL: 'https://discover.legal' });
const preview = load({ NODE_ENV: 'production' });
const dev = load({ NODE_ENV: 'development' });

describe('next.config.mjs', () => {
  it('builds a standalone server with X-Powered-By, the image optimizer, sharp and agent files off', () => {
    expect(prod).toMatchObject({ output: 'standalone', poweredByHeader: false, agentRules: false, images: { unoptimized: true } });
    expect((prod.outputFileTracingExcludes as Record<string, string[]>)['*'])
      .toEqual(expect.arrayContaining(['node_modules/sharp/**', 'node_modules/@img/**']));
  });

  it('sends the baseline security headers on every path, matching or exceeding the old production site', () => {
    for (const path of ['/', '/no-such-page', '/_next/static/chunks/x.js', '/api/health']) {
      expect(header(prod, path, 'Strict-Transport-Security')).toEqual(['max-age=63072000; includeSubDomains; preload']);
      expect(header(prod, path, 'X-Content-Type-Options')).toEqual(['nosniff']);
      expect(header(prod, path, 'X-Frame-Options')).toEqual(['DENY']);
      expect(header(prod, path, 'Referrer-Policy')).toEqual(['strict-origin-when-cross-origin']);
      expect(header(prod, path, 'Cross-Origin-Opener-Policy')).toEqual(['same-origin']);
      expect(header(prod, path, 'Cross-Origin-Resource-Policy')).toEqual(['same-origin']);
      expect(header(prod, path, 'Permissions-Policy')[0]).toMatch(/^camera=\(\), microphone=\(\), geolocation=\(\), payment=\(\)/);
      expect(header(prod, path, 'Content-Security-Policy')).toHaveLength(1);
    }
  });

  it('has a production CSP that allows only this origin, no eval, no frames, no forms, no base, no plugins', () => {
    const d = directives(header(prod, '/', 'Content-Security-Policy')[0]);
    expect(Object.fromEntries(d)).toEqual({
      'default-src': "'self'", 'script-src': "'self' 'unsafe-inline'", 'style-src': "'self'", 'img-src': "'self' data:",
      'font-src': "'self'", 'connect-src': "'self'", 'frame-src': "'none'", 'frame-ancestors': "'none'",
      'form-action': "'none'", 'base-uri': "'none'", 'object-src': "'none'", 'upgrade-insecure-requests': '',
    });
    expect(header(prod, '/', 'Content-Security-Policy')[0]).not.toMatch(/google|https?:/);
  });

  it('lets this origin frame a replay preview under /demo (later rule wins in Next); nothing else is frameable', () => {
    const page = '/demo/on-marcus/v1/n/a.html';
    expect(header(prod, page, 'X-Frame-Options')).toEqual(['DENY', 'SAMEORIGIN']);
    const [base, demo] = header(prod, page, 'Content-Security-Policy').map((c) => Object.fromEntries(directives(c)));
    expect(demo).toEqual({ ...base, 'frame-ancestors': "'self'" }); // style-src stays 'self': preview CSS is a linked file
    for (const path of ['/', '/demo-x', '/documents/demo/a.html']) expect(header(prod, path, 'X-Frame-Options')).toEqual(['DENY']);
  });

  it('upgrades insecure requests only in an https build (plain-http hosts would lose every asset)', () => {
    expect(header(prod, '/', 'Content-Security-Policy')[0]).toMatch(/; upgrade-insecure-requests$/);
    expect(header(load({ NEXT_PUBLIC_SITE_URL: 'https://site-v6.onrender.com' }), '/', 'Content-Security-Policy')[0]).toMatch(/upgrade-insecure/);
    for (const c of [preview, dev, load({ NEXT_PUBLIC_SITE_URL: 'http://192.0.2.2:3000' })]) {
      expect(header(c, '/', 'Content-Security-Policy')[0]).not.toMatch(/upgrade-insecure/);
    }
  });

  it('adds eval (and inline style) to the CSP only under next dev', () => {
    const d = directives(header(dev, '/', 'Content-Security-Policy')[0]);
    expect(d.get('script-src')).toBe("'self' 'unsafe-inline' 'unsafe-eval'");
    expect(d.get('style-src')).toBe("'self' 'unsafe-inline'");
  });

  it('is noindex everywhere except a build whose NEXT_PUBLIC_SITE_URL is exactly the production origin', () => {
    expect(header(prod, '/', 'X-Robots-Tag')).toEqual([]);
    expect(header(prod, '/api/health', 'X-Robots-Tag')).toEqual(['noindex, nofollow']); // a copy of the home page
    expect(header(preview, '/', 'X-Robots-Tag')).toEqual(['noindex, nofollow']);
    for (const url of ['https://discover.legal/', 'http://discover.legal', 'https://site-v6.onrender.com']) {
      expect(header(load({ NEXT_PUBLIC_SITE_URL: url }), '/', 'X-Robots-Tag')).toEqual(['noindex, nofollow']);
    }
  });

  it('makes HTML revalidate, but leaves hashed /_next/static assets to Next (immutable)', () => {
    expect(header(prod, '/', 'Cache-Control')).toEqual(['public, max-age=0, must-revalidate']);
    expect(header(prod, '/api/health', 'Cache-Control')).toEqual(['public, max-age=0, must-revalidate']);
    expect(header(prod, '/_next/static/chunks/x.js', 'Cache-Control')).toEqual([]);
  });

  it('answers the Render health path and /favicon.ico from static files (no API code)', () => {
    expect(prod.rewrites).toEqual([{ source: '/api/health', destination: '/' }, { source: '/favicon.ico', destination: '/icon.svg' }]);
  });
});
