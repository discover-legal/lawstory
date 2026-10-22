import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

// /demo/biglaw is BigLaw's own UI on a recorded engine, vendored as built output by
// scripts/sync-biglaw-demo.mjs (outside the line budgets). It must never reach the network and must run
// under the /demo/** CSP: one same-origin module script and one stylesheet, nothing inline.
const dir = join(__dirname, '..', '..', 'public', 'demo', 'biglaw');
const walk = (d: string): string[] => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]));
const files = walk(dir);
const NET = /\bfetch\s*\(|XMLHttpRequest|EventSource|WebSocket|sendBeacon/;

describe('the vendored BigLaw demo (public/demo/biglaw)', () => {
  it('is only index.html, VERSION and hashed js/css/image assets, under 1 MB', () => {
    const rel = files.map((f) => f.slice(dir.length + 1)).sort();
    expect(rel.filter((f) => !/^(index\.html|VERSION|assets\/[\w-]+\.(js|css|jpg|png|webp))$/.test(f))).toEqual([]);
    expect(rel.filter((f) => f.endsWith('.js'))).toHaveLength(1);
    expect(files.reduce((n, f) => n + statSync(f).size, 0)).toBeLessThan(1_000_000);
  });

  it('records the BigLaw commit it was built from', () => {
    expect(readFileSync(join(dir, 'VERSION'), 'utf8')).toMatch(/^BigLaw [0-9a-f]{40}\n/);
  });

  it('uses no network API (fetch, XMLHttpRequest, EventSource, WebSocket, sendBeacon)', () => {
    const scanned = files.filter((f) => /\.(js|html|css)$/.test(f));
    expect(scanned.length).toBeGreaterThanOrEqual(3);
    expect(scanned.filter((f) => NET.test(readFileSync(f, 'utf8')))).toEqual([]);
  });

  it('loads its script and stylesheet from /demo/biglaw/assets and has no inline script or style', () => {
    const html = readFileSync(join(dir, 'index.html'), 'utf8');
    expect(html).toMatch(/<script type="module" crossorigin src="\/demo\/biglaw\/assets\/[\w-]+\.js"><\/script>/);
    expect(html).toMatch(/<link rel="stylesheet" crossorigin href="\/demo\/biglaw\/assets\/[\w-]+\.css">/);
    expect(html).not.toMatch(/<script(?![^>]*\bsrc=)[^>]*>|<style\b|\sstyle=|\son\w+=/i);
    expect(html).not.toMatch(/https?:\/\/(?!www\.w3\.org\/)/); // the SVG favicon's xmlns only
  });
});
