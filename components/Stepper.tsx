'use client';
import { Children, useRef, useState } from 'react';
import { useHydrated } from './useHydrated';

const BTN = 'inline-flex items-center justify-center px-5 py-2.5 rounded-lg font-semibold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed';

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
    <div className="scroll-mt-24 space-y-6 outline-none" ref={top} tabIndex={-1} aria-label="Sample walkthrough">
      {js && (
        <ol className="flex flex-wrap gap-2">
          {titles.map((t, i) => (
            <li key={t}>
              <button type="button" aria-current={i === at ? 'step' : undefined} onClick={() => go(i)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${i === at
                  ? 'bg-slate-900 text-white' : i < at ? 'bg-brand-tint text-brand hover:bg-brand-soft' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                {i + 1}. {t}
              </button>
            </li>
          ))}
        </ol>
      )}
      <ol className="space-y-6">
        {steps.map((s, i) => <li key={titles[i]} hidden={js && i !== at}>{s}</li>)}
      </ol>
      {js && (
        <div className="flex items-center justify-between gap-4">
          <button type="button" className={`${BTN} bg-white text-slate-900 border border-slate-300 hover:bg-slate-50`} disabled={at === 0} onClick={() => go(at - 1)}>Back</button>
          <p className="text-sm text-slate-500" aria-live="polite">Step {at + 1} of {steps.length}</p>
          <button type="button" className={`${BTN} bg-slate-900 text-white hover:bg-slate-800`} disabled={at === steps.length - 1} onClick={() => go(at + 1)}>Next</button>
        </div>
      )}
    </div>
  );
}
