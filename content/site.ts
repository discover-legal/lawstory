// Site copy and contact settings as typed data. NEXT_PUBLIC_* values are inlined at build time.
export const PRODUCTION_ORIGIN = 'https://discover.legal';
/** Only the production build is indexable (next.config.mjs sends X-Robots-Tag noindex everywhere else). */
export const indexable = process.env.NEXT_PUBLIC_SITE_URL === PRODUCTION_ORIGIN;

/** Every page route; the sitemap, the smoke script and the route tests read this list. */
export const ROUTES = ['/', '/work', '/demo/discover-legal', '/demo/biglaw'] as const;
export const NAV = [{ href: '/work', label: 'Work' }, { href: '/demo/discover-legal', label: 'Documents sample' },
  { href: '/demo/biglaw', label: 'BigLaw sample' }] as const;
export const BIGLAW_REPO = 'https://github.com/discover-legal/BigLaw';

/** The booking link when it is an https URL; anything else (unset, javascript:, http:) is ignored. */
export function bookingUrl(raw: string | undefined = process.env.NEXT_PUBLIC_BOOKING_URL): string | null {
  try { const u = new URL(raw ?? ''); return u.protocol === 'https:' ? u.href : null; } catch { return null; }
}

// The email is never a literal in HTML or JS: the browser assembles it after hydration (Cta).
const LOCAL = 'h';
const APEX = ['discover', 'legal'];
/** mailto for the apex of the page's own host (www./ca. stripped); our apex off-domain (preview, localhost). */
export function mailto(host: string): string {
  const parts = host.split('.').filter(Boolean);
  const ours = parts.slice(-2).join('.') === APEX.join('.');
  return ['mailto:', LOCAL, String.fromCharCode(64), ours ? parts.slice(-2).join('.') : APEX.join('.')].join('');
}
/** The no-JavaScript fallback, spelled out so a person can type it and a naive scraper cannot. */
export const EMAIL_SPELLED = `${LOCAL} at ${APEX.join(' dot ')}`;

export type Work = { name: string; status: string; body: string; links: { href: string; label: string }[] };
export const WORK: Work[] = [
  { name: 'discover.legal Documents (Ontario)', status: 'Demo only: a scripted sample, not a live product',
    body: 'An AI interview that turns a family-law client\'s story into structured facts and draft Ontario documents, with a Draft note wherever a fact is missing. The earlier self-serve product is retired; what you can see today is a sample walkthrough.',
    links: [{ href: '/demo/discover-legal', label: 'See the sample' }] },
  { name: 'BigLaw', status: 'Open source; version 2 in development',
    body: 'A multi-agent platform for small firms: specialist agents research a matter, every quoted passage is checked against the source documents, and anything that cannot be verified is kept out of the memo and disclosed in an Evidence Note.',
    links: [{ href: '/demo/biglaw', label: 'See the sample' }, { href: BIGLAW_REPO, label: 'Source on GitHub' }] },
];

export type Service = { name: string; headline: string; body: string; price: number | null };
export const SERVICES: Service[] = [
  { name: 'Buy', headline: 'Choose the right tools, on your terms.', price: null,
    body: 'Independent selection: what you need, which vendors deliver it, and what the contract should say about your data. No vendor referral fees.' },
  { name: 'Build', headline: 'Build what the market does not sell.', price: null,
    body: 'Client intake, document automation and AI-assisted workflows with human review gates. Code owns the rules, the model supplies language, and you own the code.' },
  { name: 'Run', headline: 'Managed operation on your infrastructure.', price: null,
    body: 'Hosting, monitoring, updates, backups and support. Your data stays in your environment; you keep the keys.' },
  { name: 'Advise', headline: 'Technical leadership without the headcount.', price: null,
    body: 'Roadmap, AI use policy, build-versus-buy decisions and vendor negotiation support, on retainer or for a defined project.' },
];
export const price = (p: number | null) => (p === null ? 'Price on request' : `CAD ${p.toLocaleString('en-CA')}`);
