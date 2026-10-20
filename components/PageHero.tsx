/** The inner-page header: eyebrow, h1 and lede, in the home hero's type scale. */
export function PageHero({ eyebrow, title, children }: { eyebrow: string; title: string; children?: React.ReactNode }) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-brand-tint/70 to-white" aria-labelledby="page-title">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 sm:pt-20 pb-12">
        <p className="text-sm font-semibold text-brand uppercase tracking-wider mb-4">{eyebrow}</p>
        <h1 id="page-title" className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-slate-900 leading-[1.05] mb-6 max-w-3xl">{title}</h1>
        {children && <div className="text-lg sm:text-xl text-slate-600 max-w-2xl leading-relaxed">{children}</div>}
      </div>
    </section>
  );
}
