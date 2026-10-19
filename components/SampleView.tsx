import type { Finding, Sample, Step } from '@/content/samples/types';
import { Stepper } from './Stepper';

const CHECK: Record<Finding['check'], string> = { exact: 'Verified: exact match', tolerant: 'Verified: tolerant match',
  excluded: 'Not verified: excluded' };

function StepBody({ step, n }: { step: Step; n: number }) {
  return (
    <article className="step">
      <p className="kicker">Step {n}</p>
      <h2>{step.title}</h2>
      <p className="muted">{step.summary}</p>
      {step.turns && (
        <ul className="turns">
          {step.turns.map((t, i) => <li key={i} className={`turn turn-${t.who}`}><span className="who">{t.who === 'client' ? 'Client' : 'Assistant'}</span> {t.text}</li>)}
        </ul>
      )}
      {step.facts && (
        <dl className="facts">
          {step.facts.map((f) => (
            <div key={f.field}>
              <dt>{f.field}</dt>
              <dd>{f.value ?? <span className="status">Not stated: left blank</span>}{f.quote && <q>{f.quote}</q>}</dd>
            </div>
          ))}
        </dl>
      )}
      {step.findings && (
        <ul className="findings">
          {step.findings.map((f) => (
            <li key={f.claim} className="card">
              <span className={`badge badge-${f.check}`}>{CHECK[f.check]}</span>
              <p>{f.claim}</p>
              <blockquote>{f.quote}</blockquote>
              <p className="muted">{f.source}</p>
            </li>
          ))}
        </ul>
      )}
      {step.doc && (
        <section className="doc" aria-label={step.doc.title}>
          <p className="kicker">{step.doc.title}</p>
          {step.doc.blocks.map((b, i) => (b.kind === 'heading' ? <h3 key={i}>{b.text}</h3> : <p key={i} className={b.kind === 'note' ? 'note' : undefined}>{b.text}</p>))}
        </section>
      )}
    </article>
  );
}

export function SampleView({ sample, children }: { sample: Sample; children?: React.ReactNode }) {
  return (
    <>
      <section className="hero" aria-labelledby="sample-title">
        <p className="banner" role="note">{sample.disclosure}</p>
        <h1 id="sample-title">{sample.title}</h1>
        <p className="lede">{sample.lede}</p>
      </section>
      <Stepper titles={sample.steps.map((s) => s.title)}>
        {sample.steps.map((s, i) => <StepBody key={s.title} step={s} n={i + 1} />)}
      </Stepper>
      {children}
    </>
  );
}
