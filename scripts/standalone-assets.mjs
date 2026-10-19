// After `next build` (npm run build runs it): fail unless every app route was prerendered (README:
// "every page is prerendered"; a page reading cookies() or `force-dynamic` would quietly become
// server-rendered), then copy what the standalone server serves but Next does not copy itself
// (.next/static and public/), so `npm start` serves CSS and icons exactly as the Docker image does.
// Usage: node scripts/standalone-assets.mjs [distDir=.next]
import { cpSync, existsSync, readFileSync } from 'node:fs';

const dist = process.argv[2] ?? '.next';
const out = `${dist}/standalone`;
if (!existsSync(`${out}/server.js`)) throw new Error(`${out}/server.js missing: run next build first`);
const json = (f) => JSON.parse(readFileSync(`${dist}/${f}`, 'utf8'));
const routes = Object.values(json('app-path-routes-manifest.json'));
const pm = json('prerender-manifest.json');
// A [param] route counts when fallback is false: every param is prerendered (generateStaticParams +
// dynamicParams = false), and anything else 404s.
const dynamic = routes.filter((r) => !Object.hasOwn(pm.routes, r) && pm.dynamicRoutes?.[r]?.fallback !== false);
if (routes.length === 0 || dynamic.length > 0) {
  console.error(`not prerendered (every route must be static): ${dynamic.join(' ') || 'no routes found'}`);
  process.exit(1);
}
cpSync(`${dist}/static`, `${out}/.next/static`, { recursive: true });
if (existsSync('public')) cpSync('public', `${out}/public`, { recursive: true });
