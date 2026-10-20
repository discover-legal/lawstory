// HTTP smoke of a running build (CI runs it against the standalone server and the Docker image).
// Usage: node scripts/smoke.mjs <baseUrl> [--indexable]. Waits up to SMOKE_WAIT_S (default 30) seconds
// for the server to accept connections, then exits 1 and lists every failed check.
const [base, flag] = process.argv.slice(2);
const deadline = Date.now() + (Number(process.env.SMOKE_WAIT_S) || 30) * 1000;
for (;;) {
  try { await fetch(`${base}/api/health`); break; } catch (e) {
    if (Date.now() > deadline) { console.error(`SMOKE FAIL: ${base} not reachable (${e.cause?.code ?? e.message})`); process.exit(1); }
    await new Promise((r) => setTimeout(r, 250));
  }
}
const fails = [];
const check = (ok, what) => { if (!ok) fails.push(what); };
const get = async (p) => { const r = await fetch(base + p, { redirect: 'manual' }); return { r, body: await r.text() }; };

const home = await get('/');
const h = (k) => home.r.headers.get(k) ?? '';
check(home.r.status === 200, `/ status ${home.r.status}`);
check(h('content-security-policy').includes("frame-ancestors 'none'"), '/ CSP frame-ancestors');
check(h('strict-transport-security').startsWith('max-age=63072000'), '/ HSTS');
check(h('x-content-type-options') === 'nosniff' && h('x-frame-options') === 'DENY', '/ nosniff + DENY');
check(h('cache-control') === 'public, max-age=0, must-revalidate', `/ cache-control ${h('cache-control')}`);
check(!home.r.headers.has('x-powered-by'), '/ x-powered-by present');
check((flag === '--indexable') === !home.r.headers.has('x-robots-tag'), `/ x-robots-tag ${h('x-robots-tag') || 'absent'}`);
const demo = (await get('/demo/x/n/a.html')).r.headers; // a replay preview: frameable by this origin only
check(demo.get('x-frame-options') === 'SAMEORIGIN' && /frame-ancestors 'self';/.test(demo.get('content-security-policy')), '/demo frame headers');
const css = home.body.match(/\/_next\/static\/[^"]+\.css/)?.[0];
check(css && (await get(css)).r.status === 200, `stylesheet ${css} not served`);
check((await get('/api/health')).r.status === 200, '/api/health not 200');
const nf = await get('/no-such-page');
check(nf.r.status === 404 && nf.body.includes('<title>Page not found'), '/no-such-page: 404 page');
check((await get('/_next/image?url=%2Ficon.svg&w=64&q=75')).r.status === 404, '/_next/image optimizer reachable');
// Every page (content/site.ts ROUTES; pages.test keeps the lists equal): 200, prerendered, no form
// controls, no literal email; then every internal link found on them resolves (no dead links).
const ROUTES = ['/', '/work', '/demo/discover-legal', '/demo/biglaw', '/research', '/privacy', '/tos'];
const links = new Set(['/sitemap.xml', '/robots.txt']);
for (const p of ROUTES) {
  const { r, body } = await get(p);
  check(r.status === 200 && /^1(, 1)*$/.test(r.headers.get('x-nextjs-prerender') ?? ''), `${p} status ${r.status}, not prerendered`);
  check(!/<(form|input|textarea|select)\b/i.test(body) && !body.includes('@discover.legal'), `${p} has a form control or an email`);
  for (const m of body.matchAll(/href="(\/(?!\/|_next\/)[^"#?]*)/g)) links.add(m[1]);
}
for (const l of links) { const { r } = await get(l); check(r.status === 200, `link ${l} status ${r.status}`); }
for (const f of fails) console.error(`SMOKE FAIL: ${f}`);
console.log(`smoke ${base}: ${fails.length ? `${fails.length} failed` : 'ok'}`);
process.exit(fails.length ? 1 : 0);
