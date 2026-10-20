import { PageHero } from './PageHero';

export type ProseSection = { h: string; p: string[] };
/** A plain legal page (privacy, terms): one card of headed paragraphs. */
export function ProsePage({ title, updated, intro, sections }: { title: string; updated: string; intro: string; sections: ProseSection[] }) {
  return (
    <>
      <PageHero eyebrow={`Last updated ${updated}`} title={title}><p>{intro}</p></PageHero>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-lg shadow-slate-900/5 p-6 sm:p-8 lg:p-12 space-y-8">
          {sections.map((s) => (
            <section key={s.h}>
              <h2 className="text-xl font-bold text-slate-900 mb-3">{s.h}</h2>
              {s.p.map((t) => <p key={t} className="text-base text-slate-600 leading-relaxed mb-3">{t}</p>)}
            </section>
          ))}
        </div>
      </div>
    </>
  );
}
