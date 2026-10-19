'use client';
import { Children, useRef, useState } from 'react';
import { useHydrated } from './useHydrated';

/**
 * Without JavaScript every step is visible, in order. With JavaScript one step shows at a time, with
 * Back/Next, a progress line and a clickable step list.
 */
export function Stepper({ titles, children }: { titles: string[]; children: React.ReactNode }) {
  const js = useHydrated();
  const [at, setAt] = useState(0);
  const top = useRef<HTMLDivElement>(null);
  const steps = Children.toArray(children);
  const go = (i: number) => { setAt(i); top.current?.focus(); };
  return (
    <div className="stepper" ref={top} tabIndex={-1} aria-label="Sample walkthrough">
      {js && (
        <ol className="step-nav">
          {titles.map((t, i) => (
            <li key={t}><button type="button" aria-current={i === at ? 'step' : undefined} onClick={() => go(i)}>{i + 1}. {t}</button></li>
          ))}
        </ol>
      )}
      <ol className="steps">
        {steps.map((s, i) => <li key={titles[i]} hidden={js && i !== at}>{s}</li>)}
      </ol>
      {js && (
        <div className="step-controls">
          <button type="button" className="btn btn-quiet" disabled={at === 0} onClick={() => go(at - 1)}>Back</button>
          <p className="muted" aria-live="polite">Step {at + 1} of {steps.length}</p>
          <button type="button" className="btn" disabled={at === steps.length - 1} onClick={() => go(at + 1)}>Next</button>
        </div>
      )}
    </div>
  );
}
