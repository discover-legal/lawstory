// Next.js config. Everything here is read at build time and baked into the output (headers go into
// routes-manifest.json), so NEXT_PUBLIC_SITE_URL must be set as a Docker build arg. README "Security
// headers" lists each header; __tests__/site/config.test.ts pins them.
const PRODUCTION_ORIGIN = 'https://discover.legal';
const dev = process.env.NODE_ENV === 'development';
// Only the production build is indexable; every other deployment (Render preview, local) is noindex.
const indexable = process.env.NEXT_PUBLIC_SITE_URL === PRODUCTION_ORIGIN;

const CSP = {
  'default-src': ["'self'"],
  // Next's inline bootstrap needs 'unsafe-inline'; `next dev` also needs eval for React's dev tooling.
  'script-src': ["'self'", "'unsafe-inline'", ...(dev ? ["'unsafe-eval'"] : [])],
  'style-src': ["'self'", ...(dev ? ["'unsafe-inline'"] : [])],
  'img-src': ["'self'", 'data:'],
  'font-src': ["'self'"],
  'connect-src': ["'self'"],
  'frame-src': ["'none'"], // S6 widens: 'self' (the replay) and the BigLaw demo origin
  'frame-ancestors': ["'none'"], // S6: 'self' on /documents/embed only
  'form-action': ["'none'"], // the site has no forms
  'base-uri': ["'none'"],
  'object-src': ["'none'"],
  // Only for an https build: on plain http (a LAN phone, a Docker host IP) it would break every asset.
  ...(!dev && process.env.NEXT_PUBLIC_SITE_URL?.startsWith('https://') ? { 'upgrade-insecure-requests': [] } : {}),
};
export const csp = Object.entries(CSP).map(([k, v]) => [k, ...v].join(' ')).join('; ');

export const HTML_CACHE = 'public, max-age=0, must-revalidate';

export const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()',
  },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
  { key: 'X-DNS-Prefetch-Control', value: 'off' },
  { key: 'X-Permitted-Cross-Domain-Policies', value: 'none' },
  ...(indexable ? [] : [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }]),
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone', // the Dockerfile and `npm start` run .next/standalone/server.js
  poweredByHeader: false,
  reactStrictMode: true,
  agentRules: false, // otherwise `next dev` writes vendor text into the tracked CLAUDE.md / AGENTS.md
  images: { unoptimized: true }, // no next/image: the /_next/image optimizer endpoint stays off
  // sharp (Next's optional image library) is unreachable with the optimizer off; keep it out of the image.
  outputFileTracingExcludes: { '*': ['node_modules/sharp/**', 'node_modules/@img/**', 'node_modules/@emnapi/**'] },
  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      // Next marks prerendered HTML `s-maxage=31536000`: a shared cache could then serve a page whose
      // hashed chunks a later deploy removed. HTML always revalidates; hashed /_next/static stays immutable.
      { source: '/((?!_next/static/).*)', headers: [{ key: 'Cache-Control', value: HTML_CACHE }] },
      // The health path serves the home page's HTML: never let it be indexed as a duplicate home.
      { source: '/api/health', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] },
    ];
  },
  async rewrites() {
    // Render health check. The old site answers /api/health even in maintenance mode, so this one path
    // is healthy on both sites across the cutover (PLAN C). It serves the static home; no API code.
    return [{ source: '/api/health', destination: '/' }, { source: '/favicon.ico', destination: '/icon.svg' }];
  },
  // Redirects arrive with S7. See README.
};

export default nextConfig;
