import type { Metadata } from 'next';
import { Icon } from '@/components/Icon';
import { PageHero } from '@/components/PageHero';
import { ClosingCta, WRAP } from '@/components/SiteChrome';
import { PRICE, SERVICES } from '@/content/site';

export const metadata: Metadata = { title: 'Services', description: 'Buy, build, run and advise: legal technology consultancy for law firms and legal teams. Prices on request.' };

export default function WorkPage() {
  return (
    <>
      <PageHero eyebrow="Services" title="Four ways to work with us.">
        <p>Select a tool, build the gap, have it run for you, keep a technical lead on call. Every engagement is scoped in
          writing first. We are a technology consultancy, not a law firm, and we do not give legal advice.</p>
      </PageHero>
      <section className={`${WRAP} pb-20 space-y-8`} aria-label="Services">
        {SERVICES.map((s) => (
          <article key={s.key} id={s.key} aria-labelledby={`${s.key}-title`} className="scroll-mt-24 rounded-2xl bg-white border border-slate-200 p-8 sm:p-10 grid lg:grid-cols-12 gap-8">
            <div className="lg:col-span-7">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-6 ${s.tint}`}><Icon name={s.icon} className="h-6 w-6" /></div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">{s.name}</p>
              <h2 id={`${s.key}-title`} className="text-2xl sm:text-3xl font-bold text-slate-900 mb-4">{s.headline}</h2>
              <p className="text-base text-slate-700 mb-4 leading-relaxed">{s.body}</p>
              <p className="text-base text-slate-600 mb-6 leading-relaxed">{s.engagement}</p>
              <p className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">{PRICE}</p>
            </div>
            <div className="lg:col-span-5 lg:border-l lg:border-slate-200 lg:pl-8">
              <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4">What you get</h3>
              <ul className="space-y-3">
                {s.deliverables.map((d) => (
                  <li key={d} className="flex items-start gap-3 text-sm text-slate-700 leading-relaxed"><Icon name="check" className="h-5 w-5 flex-shrink-0 text-emerald-600" />{d}</li>
                ))}
              </ul>
            </div>
          </article>
        ))}
      </section>
      <ClosingCta />
    </>
  );
}
