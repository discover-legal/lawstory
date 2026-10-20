import type { Metadata } from 'next';
import { Icon } from '@/components/Icon';
import { PageHero } from '@/components/PageHero';
import { ClosingCta, WRAP } from '@/components/SiteChrome';
import { RESEARCH } from '@/content/site';

export const metadata: Metadata = { title: 'Research', description: 'Open experiments on how language models behave on legal tasks, published with their code, design and current status.' };

export default function ResearchPage() {
  return (
    <>
      <PageHero eyebrow="Research" title="Questions we are testing in public.">
        <p>Open experiments on how language models behave on legal tasks. Each project is published with its code and design,
          and its status is stated as it is: a pilot is a pilot, and a result is only claimed once the full run exists.</p>
      </PageHero>
      <section className={`${WRAP} pb-20 space-y-10`} aria-label="Projects">
        {RESEARCH.map((r) => (
          <article key={r.key} id={r.key} className="scroll-mt-24 rounded-2xl border border-slate-200 p-8 sm:p-10 grid lg:grid-cols-12 gap-8">
            <div className="lg:col-span-7">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-6 bg-brand-tint text-brand"><Icon name="flask" className="h-6 w-6" /></div>
              <p className="text-xs font-semibold text-slate-500 mb-2">{r.status}</p>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-4">{r.title}</h2>
              <p className="text-base text-slate-700 mb-4 leading-relaxed">{r.question}</p>
              <p className="text-base text-slate-600 mb-6 leading-relaxed">{r.summary}</p>
              {r.pilotNote && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 mb-6">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">From the pilot</p>
                  <p className="text-sm text-slate-700 leading-relaxed">{r.pilotNote}</p>
                </div>
              )}
              <a href={r.repo} rel="noopener noreferrer" className="group inline-flex items-center px-5 py-3 rounded-lg font-semibold text-sm bg-slate-900 text-white hover:bg-slate-800 transition-all">
                <Icon name="code" className="mr-2 h-4 w-4" />Code and design on GitHub
                <Icon name="arrowRight" className="ml-2 h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
              </a>
            </div>
            <div className="lg:col-span-5 lg:border-l lg:border-slate-200 lg:pl-8">
              <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4">Design</h3>
              <ul className="space-y-3">
                {r.facts.map((f) => (
                  <li key={f} className="flex items-start gap-3 text-sm text-slate-700 leading-relaxed"><Icon name="check" className="h-5 w-5 flex-shrink-0 text-emerald-600" />{f}</li>
                ))}
              </ul>
            </div>
          </article>
        ))}
      </section>
      <ClosingCta title="Have a question worth testing?">
        Firms sometimes need an answer no vendor benchmark gives them: how a model does on their documents, in their language,
        under their constraints. That is a scoped engagement.
      </ClosingCta>
    </>
  );
}
