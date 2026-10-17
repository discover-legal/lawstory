// After `next build`: copy what the standalone server serves but Next does not copy itself
// (.next/static and public/), so `npm start` (node .next/standalone/server.js) serves CSS and icons
// exactly as the Docker image does. Usage: node scripts/standalone-assets.mjs
import { cpSync, existsSync } from 'node:fs';

const out = '.next/standalone';
if (!existsSync(`${out}/server.js`)) throw new Error(`${out}/server.js missing: run next build first`);
cpSync('.next/static', `${out}/.next/static`, { recursive: true });
if (existsSync('public')) cpSync('public', `${out}/public`, { recursive: true });
