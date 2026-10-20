import type { Finding, Sample, Step } from '@/content/samples/types';
import { Icon } from './Icon';
import { PageHero } from './PageHero';
import { Stepper } from './Stepper';

const CHECK: Record<Finding['check'], [string, string]> = {
  exact: ['Verified: exact match', 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'],
  tolerant: ['Verified: tolerant match', 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'],
  excluded: ['Not verified: excluded', 'bg-red-50 text-red-700 ring-red-600/20'],
};
const KICKER = 'text-xs font-semibold uppercase tracking-wider text-slate-500';

function StepBody({ step, n }: { step: Step; n: number }) {
  return (
    <article className="rounded-2xl bg-white border border-slate-200 p-6 sm:p-8 space-y-6">
      <div>
        <p className="text-sm font-semibold text-brand uppercase tracking-wider mb-2">Step {n}</p>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 mb-2">{step.title}</h2>
        <p className="text-base text-slate-600">{step.summary}</p>
      </div>
      {step.turns && (
        <ul className="space-y-3">
          {step.turns.map((t, i) => (
            <li key={i} className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${t.who === 'client'
              ? 'ml-auto bg-slate-900 text-white rounded-br-sm' : 'bg-slate-100 text-slate-800 rounded-bl-sm'}`}>
              <span className={`block text-xs font-semibold mb-1 ${t.who === 'client' ? 'text-slate-400' : 'text-brand'}`}>
                {t.who === 'client' ? 'Client' : 'Assistant'}
              </span>
              {t.text}
            </li>
          ))}
        </ul>
      )}
      {step.facts && (
        <dl className="divide-y divide-slate-200 rounded-xl border border-slate-200">
          {step.facts.map((f) => (
            <div key={f.field} className="grid sm:grid-cols-3 gap-1 sm:gap-4 px-4 py-3">
              <dt className="text-sm font-semibold text-slate-900">{f.field}</dt>
              <dd className="sm:col-span-2 text-sm text-slate-700">
                {f.value ?? <span className="inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800 ring-1 ring-inset ring-amber-600/20">Not stated: left blank</span>}
                {f.quote && <q className="block mt-1 text-xs italic text-slate-500">{f.quote}</q>}
              </dd>
            </div>
          ))}
        </dl>
      )}
      {step.findings && (
        <ul className="grid md:grid-cols-2 gap-4">
          {step.findings.map((f) => (
            <li key={f.claim} className="rounded-xl border border-slate-200 bg-slate-50 p-5">
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${CHECK[f.check][1]}`}>
                {f.check !== 'excluded' && <Icon name="check" className="mr-1 h-3.5 w-3.5" />}{CHECK[f.check][0]}
              </span>
              <p className="mt-3 text-sm font-semibold text-slate-900">{f.claim}</p>
              <blockquote className="mt-2 border-l-2 border-brand pl-3 text-sm italic text-slate-600">{f.quote}</blockquote>
              <p className="mt-2 text-xs text-slate-500">{f.source}</p>
            </li>
          ))}
        </ul>
      )}
      {step.doc && (
        <section className="rounded-xl border border-slate-200 bg-slate-50 p-6 space-y-3" aria-label={step.doc.title}>
          <p className={KICKER}>{step.doc.title}</p>
          {step.doc.blocks.map((b, i) => (b.kind === 'heading'
            ? <h3 key={i} className="text-lg font-bold text-slate-900">{b.text}</h3>
            : <p key={i} className={b.kind === 'note'
              ? 'rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900' : 'text-sm text-slate-700 leading-relaxed'}>{b.text}</p>))}
        </section>
      )}
    </article>
  );
}

export function SampleView({ sample, children }: { sample: Sample; children?: React.ReactNode }) {
  return (
    <>
      <PageHero eyebrow="Sample walkthrough" title={sample.title}>
        <p className="mb-6">{sample.lede}</p>
        <p role="note" className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <Icon name="eye" className="h-5 w-5 flex-shrink-0 text-amber-600" />{sample.disclosure}
        </p>
      </PageHero>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <Stepper titles={sample.steps.map((s) => s.title)}>
          {sample.steps.map((s, i) => <StepBody key={s.title} step={s} n={i + 1} />)}
        </Stepper>
      </div>
      {children}
    </>
  );
}
