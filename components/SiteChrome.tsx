import Link from 'next/link';
import { BIGLAW_REPO, EMAIL_SPELLED, GITHUB_ORG, NAV, SERVICES } from '@/content/site';
import { ContactCta } from './ContactCta';
import { Icon } from './Icon';

export const WRAP = 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8';

function Mark({ dark = false }: { dark?: boolean }) {
  return (
    <>
      <span className="relative">
        {!dark && <span className="absolute inset-0 bg-gradient-to-br from-brand to-brand-strong rounded-lg blur-sm opacity-40" />}
        <span className={`relative block rounded-lg p-1.5 bg-gradient-to-br ${dark ? 'from-slate-700 to-slate-900' : 'from-slate-900 to-slate-700'}`}>
          <Icon name="scale" className="h-5 w-5 text-white" />
        </span>
      </span>
      <span className={`text-lg sm:text-xl font-bold tracking-tight ${dark ? 'text-white' : 'text-slate-900'}`}>
        discover<span className="text-brand">.</span>legal
      </span>
    </>
  );
}

export function SiteNav() {
  return (
    <nav aria-label="Main" className="sticky top-0 z-50 bg-white border-b border-slate-200/70">
      <div className={WRAP}>
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
            <Mark />
          </Link>
          <div className="flex items-center gap-1 sm:gap-2">
            {NAV.map((l) => (
              <Link key={l.href} href={l.href} className="hidden md:inline text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors px-3 py-2">
                {l.label}
              </Link>
            ))}
            <ContactCta variant="nav" />
          </div>
        </div>
      </div>
    </nav>
  );
}

const COLUMNS = [
  { title: 'Services', links: SERVICES.map((s, i) => ({ href: `/work#${s.key}`,
    label: `${s.name}: ${['selection', 'custom development', 'managed services', 'fractional CTO'][i]}` })) },
  { title: 'Our work', links: [{ href: '/demo/discover-legal', label: 'Documents sample' }, { href: '/demo/biglaw', label: 'BigLaw sample' },
    { href: BIGLAW_REPO, label: 'BigLaw on GitHub' }, { href: '/research', label: 'Research' }] },
  { title: 'Company', links: [{ href: GITHUB_ORG, label: 'GitHub' }, { href: '/privacy', label: 'Privacy Policy' },
    { href: '/tos', label: 'Terms of Service' }] },
];

export function SiteFooter() {
  return (
    <footer className="bg-slate-950 text-slate-400 py-12">
      <div className={WRAP}>
        <div className="grid md:grid-cols-5 gap-8 mb-10">
          <div className="md:col-span-2">
            <div className="flex items-center space-x-2 mb-3"><Mark dark /></div>
            <p className="text-sm text-slate-500 max-w-sm leading-relaxed">
              Legal technology consultancy: selection, custom builds, managed services and advisory for law firms and legal
              teams. BigLaw is free and open source. Not a law firm; not legal advice.
            </p>
            <p className="text-sm text-slate-400 mt-4" id="contact">Contact: {EMAIL_SPELLED}.</p>
          </div>
          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h2 className="text-xs font-semibold text-white uppercase tracking-wider mb-3">{col.title}</h2>
              <ul className="space-y-2 text-sm">
                {col.links.map((l) => (
                  <li key={l.href}>
                    {l.href.startsWith('https:')
                      ? <a href={l.href} rel="noopener noreferrer" className="hover:text-white transition-colors">{l.label}</a>
                      : <Link href={l.href} className="hover:text-white transition-colors">{l.label}</Link>}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-slate-500">&copy; 2026 discover.legal. All rights reserved.</p>
          <p className="text-xs text-slate-500 max-w-md text-center sm:text-right">
            We are a technology consultancy, not a law firm, and do not provide legal advice. The site has no accounts and saves nothing you do.
          </p>
        </div>
      </div>
    </footer>
  );
}

/** Section heading block: eyebrow, h2, optional lede. */
export function SectionHead({ eyebrow, title, id, children }: { eyebrow: string; title: string; id: string; children?: React.ReactNode }) {
  return (
    <div className="max-w-2xl mb-12">
      <p className="text-sm font-semibold text-brand uppercase tracking-wider mb-3">{eyebrow}</p>
      <h2 id={id} className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-slate-900 mb-4">{title}</h2>
      {children && <p className="text-lg text-slate-600">{children}</p>}
    </div>
  );
}

/** The blue gradient band that closes every page. */
export function ClosingCta({ title = 'Bring us the problem.', children }: { title?: string; children?: React.ReactNode }) {
  return (
    <section className="relative overflow-hidden" aria-labelledby="closing-title">
      <div className="absolute inset-0 bg-gradient-to-br from-brand via-brand-strong to-purple-700" />
      <div className="relative max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8 py-20 sm:py-24">
        <h2 id="closing-title" className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white mb-4">{title}</h2>
        <p className="text-lg sm:text-xl text-white/90 mb-8 max-w-2xl mx-auto">
          {children ?? 'A vendor decision, a workflow nobody sells, a platform that needs running, or a roadmap that needs an owner. We come back with a scoped proposal.'}
        </p>
        <ContactCta variant="closing" />
      </div>
    </section>
  );
}
