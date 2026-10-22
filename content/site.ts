// Site copy and contact settings as typed data. NEXT_PUBLIC_* values are inlined at build time. Keep claims
// honest: no invented client counts, no filing-readiness claims, Documents is a sample, BigLaw is experimental.
import type { IconName } from '@/components/Icon';

export const PRODUCTION_ORIGIN = 'https://discover.legal';
/** Only the production build is indexable (next.config.mjs sends X-Robots-Tag noindex everywhere else). */
export const indexable = process.env.NEXT_PUBLIC_SITE_URL === PRODUCTION_ORIGIN;

/** Every route; the sitemap, the smoke script and the route tests read this list. STATIC_APPS are vendored builds in public/. */
export const ROUTES = ['/', '/work', '/demo/discover-legal', '/demo/biglaw', '/research', '/privacy', '/tos'] as const;
export const STATIC_APPS: readonly string[] = ['/demo/biglaw'];
export const NAV = [{ href: '/work', label: 'Services' }, { href: '/demo/discover-legal', label: 'Documents' },
  { href: '/demo/biglaw', label: 'BigLaw' }, { href: '/research', label: 'Research' }] as const;
export const GITHUB_ORG = 'https://github.com/discover-legal';
export const BIGLAW_REPO = 'https://github.com/discover-legal/BigLaw';

/** The booking link when it is an https URL; anything else (unset, javascript:, http:) is ignored. */
export function bookingUrl(raw: string | undefined = process.env.NEXT_PUBLIC_BOOKING_URL): string | null {
  try { const u = new URL(raw ?? ''); return u.protocol === 'https:' ? u.href : null; } catch { return null; }
}

// The email is never a literal in HTML or JS: the browser assembles it after hydration (ContactCta).
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

/** `tint` is the icon tile's Tailwind classes (background + text colour). */
export type Service = { key: 'buy' | 'build' | 'run' | 'advise'; name: string; headline: string; body: string; icon: IconName;
  tint: string; deliverables: string[]; engagement: string };
export const SERVICES: Service[] = [
  { key: 'buy', name: 'Buy', headline: 'Choose the right tools, on your terms.', icon: 'search', tint: 'bg-brand-tint text-brand',
    body: 'Independent selection for firms buying legal technology: what you actually need, which vendors deliver it, and what the contract should say about your data.',
    deliverables: ['Needs assessment across practice groups', 'Market scan and shortlist', 'Scripted vendor demos on your matters',
      'Contract, data and AI-terms review', 'Rollout and change plan'],
    engagement: 'A fixed-scope engagement that ends with a written recommendation you can act on. We take no vendor referral fees, so the shortlist is yours, not ours.' },
  { key: 'build', name: 'Build', headline: 'Build what the market does not sell.', icon: 'hammer', tint: 'bg-purple-50 text-purple-600',
    body: 'Custom intake, document automation, AI-assisted workflows with verification gates, and the integrations that tie them to the systems your firm already runs.',
    deliverables: ['Client intake and interview flows', 'Document assembly from structured facts', 'AI workflows with human review gates',
      'Practice-management, DMS and e-signature integration', 'Source code delivered to you'],
    engagement: 'We build the way we build our own products: code owns the workflow and the rules, the model supplies judgment and language, and nothing dispositive reaches a page without a check. You own the code.' },
  { key: 'run', name: 'Run', headline: 'Managed services for the systems you rely on.', icon: 'serverCog', tint: 'bg-emerald-50 text-emerald-600',
    body: 'Hosting, monitoring, updates, backups and support for what we build or what you choose, including open-source platforms like BigLaw, on infrastructure you control.',
    deliverables: ['Deployment on your cloud or on-premises', 'Monitoring, patching and backups', 'Model-provider and cost management',
      'Access control and audit trail', 'Support desk for your staff'],
    engagement: 'A monthly service with a defined scope and response times. Your data stays in your environment; we operate it, you keep the keys.' },
  { key: 'advise', name: 'Advise', headline: 'Technical leadership without the headcount.', icon: 'compass', tint: 'bg-amber-50 text-amber-600',
    body: 'Strategy, roadmap, AI governance and build-versus-buy decisions for firms and legal teams, on retainer or for a defined project.',
    deliverables: ['Technology roadmap and budget', 'AI use policy and risk review', 'Build-versus-buy analysis',
      'Vendor negotiation support', 'Fractional CTO on retainer'],
    engagement: 'Retained or project-based. Useful when the firm needs someone technical in the room for decisions that will outlast any single vendor.' },
];
export const PRICE = 'Price on request';

export type Solution = { key: string; name: string; href: string; status: string; tagline: string; icon: IconName; tint: string;
  points: string[]; cta: string; source?: string };
export const SOLUTIONS: Solution[] = [
  { key: 'documents', name: 'discover.legal Documents', href: '/demo/discover-legal', status: 'Sample walkthrough · Ontario',
    icon: 'fileText', tint: 'bg-brand-tint text-brand', cta: 'Explore Documents',
    tagline: 'A guided interview turns a client’s story into organized Ontario family-law drafts, in the vocabulary the court uses. Shown here as a scripted sample with a fictional client.',
    points: ['Interview once; every document fills from the same record', 'Every fact keeps the words it came from',
      'A missing fact becomes a Draft note, never an invention', 'A recorded demo: no accounts, nothing sent, nothing saved'] },
  { key: 'biglaw', name: 'BigLaw', href: '/demo/biglaw', status: 'Free · Open source · Experimental', source: BIGLAW_REPO,
    icon: 'scale', tint: 'bg-purple-50 text-purple-600', cta: 'Explore BigLaw',
    tagline: 'An open-source legal AI platform: research, drafting, redlining, e-signatures, docketing and billing, orchestrated by a bench of agents with a verification protocol between every finding and the page.',
    points: ['Apache-2.0, self-hosted, one static Go binary', 'Runs on local models or your provider of choice',
      'Human gate before low-confidence findings reach synthesis', 'Built for solos, boutiques and small firms'] },
];

export type Principle = { title: string; body: string; icon: IconName; tint: string };
export const PRINCIPLES: Principle[] = [
  { title: 'Verification before output', icon: 'shieldCheck', tint: 'bg-brand-tint text-brand',
    body: 'Nothing an AI writes reaches a page without a check against the record. We build it that way, and we buy it that way.' },
  { title: 'Your data, your infrastructure', icon: 'lock', tint: 'bg-amber-50 text-amber-600',
    body: 'Client data stays in an environment you control. Open models and self-hosting are always on the table.' },
  { title: 'Open source where it counts', icon: 'gitBranch', tint: 'bg-emerald-50 text-emerald-600',
    body: 'Our own platform is public and free. When we build for you, you own the code.' },
  { title: 'Fixed scope, written outcomes', icon: 'ruler', tint: 'bg-purple-50 text-purple-600',
    body: 'Engagements end with something you can read and act on: a recommendation, a running system, or a roadmap.' },
];

export type Research = { key: string; title: string; question: string; status: string; summary: string; repo: string;
  facts: string[]; pilotNote?: string };
// Facts come from the project's README; keep them in step with it.
export const RESEARCH: Research[] = [
  { key: 'multilingual-reasoning', title: 'Does the language a model reasons in change its legal accuracy?',
    question: 'A factorial experiment over LegalBench: reasoning-language conditions × models × closed-label legal classification tasks.',
    status: 'In progress · pilot validated · no full-scale results yet', repo: 'https://github.com/hordruma/MultiLingual-Reasoning',
    summary: 'Nineteen reasoning conditions (fourteen natural languages across nine families, plus formal logic, pseudocode, an emergent notation, a wildcard, and a no-chain-of-thought control) are run against nine LegalBench tasks on a set of low-cost cloud and local models, with the final answer always requested in English.',
    facts: ['Nine closed-label LegalBench tasks: hearsay, personal jurisdiction, contract NLI, unfair terms of service and others',
      'Identical seeded samples across every cell; temperature zero and no output cap where the API allows',
      'Hidden "thinking" switched off wherever possible, and measured and reported where it cannot be',
      'Fifty-six offline tests; a live pilot run completed end to end with zero errors'],
    pilotNote: 'In the pilot, one model returned hidden reasoning on every sample, and in the Mandarin condition its visible reasoning was mostly Chinese while the hidden channel was mostly not. A model that thinks in a hidden channel is not reasoning in the requested language, which is why the design measures it.' },
];

export const FAQS = [
  { q: 'Who is this for?', a: 'Law firms and in-house legal teams that are choosing, building or running technology, from a solo practice standardising intake to a firm replacing a vendor stack.' },
  { q: 'Can I use Documents today?', a: 'Not as a public product. It is shown here as a sample walkthrough with a fictional client: there are no accounts and nothing is saved. If you want intake like it for your firm, that is a Build engagement.' },
  { q: 'Is BigLaw really free?', a: 'Yes. BigLaw is open source under Apache-2.0. Paid work is the consultancy: selection, custom builds, managed services and advisory.' },
  { q: 'What does it cost?', a: 'Prices are on request. Every engagement is scoped in writing first, so you know what you get before anything is billed.' },
  { q: 'Do you resell software or take referral fees?', a: 'No. Selection work is independent. If we recommend a vendor, it is because it fits, and the contract we review is yours.' },
  { q: 'Can you run BigLaw for my firm?', a: 'Yes, as a managed service on your infrastructure. BigLaw is experimental and has not had an independent security audit, so a deployment starts with that review and authentication switched on.' },
  { q: 'Is any of this legal advice?', a: 'No. We are a technology consultancy, not a law firm. Nothing on this site or produced by our tools is legal advice.' },
  { q: 'How do we start?', a: 'Email us with the problem. We use a first conversation to understand it and come back with a scoped proposal.' },
];
