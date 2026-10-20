import Link from 'next/link';
import { ContactCta } from '@/components/ContactCta';
import { Icon } from '@/components/Icon';
import { ClosingCta, SectionHead, WRAP } from '@/components/SiteChrome';
import { FAQS, PRINCIPLES, RESEARCH, SERVICES, SOLUTIONS } from '@/content/site';

const CARD_HOVER = 'hover:shadow-xl hover:shadow-slate-900/5 hover:-translate-y-1 transition-all';

function Hero() {
  return (
    <section className="relative overflow-hidden" aria-labelledby="hero-title">
      <div className="absolute inset-0 -z-10">
        <div className="absolute -top-40 -left-20 w-[600px] h-[600px] bg-brand-soft/60 rounded-full blur-3xl" />
        <div className="absolute -top-20 right-0 w-[500px] h-[500px] bg-purple-100/50 rounded-full blur-3xl" />
        <div className="absolute inset-0 opacity-[0.04] bg-grid" />
      </div>
      <div className={`${WRAP} pt-16 sm:pt-24 lg:pt-28 pb-16 sm:pb-20`}>
        <div className="max-w-3xl">
          <p className="text-sm font-semibold text-brand uppercase tracking-wider mb-4">Legal technology consultancy</p>
          <h1 id="hero-title" className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold tracking-tight text-slate-900 leading-[1.05] mb-6">
            From{' '}
            <span className="relative inline-block">
              <span className="relative z-10">buy</span>
              <span className="absolute bottom-1 left-0 right-0 h-3 bg-amber-200/70" />
            </span>{' '}
            to build to run.
          </h1>
          <p className="text-lg sm:text-xl text-slate-600 max-w-2xl mb-8 leading-relaxed">
            We help law firms and legal teams choose the right technology, build what the market does not sell, and run it on
            infrastructure they control. We work in the open: BigLaw is free and open source, and our Documents intake is shown as a sample.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-3">
            <ContactCta variant="hero" />
            <a href="#services" className="inline-flex items-center justify-center px-6 py-3.5 bg-white text-slate-900 text-base font-semibold rounded-xl border border-slate-300 hover:border-slate-400 hover:bg-slate-50 transition-colors">
              See the services
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

function Services() {
  return (
    <section id="services" aria-labelledby="services-title" className="scroll-mt-16 py-20 sm:py-24 bg-slate-50 border-y border-slate-200/70">
      <div className={WRAP}>
        <SectionHead eyebrow="What we do" title="Four ways to work with us." id="services-title">
          Pick one, or move through them as the firm&rsquo;s needs change: select a tool, build the gap, have it run for you,
          keep a technical lead on call. Prices on request.
        </SectionHead>
        <div className="grid md:grid-cols-2 gap-6 lg:gap-8">
          {SERVICES.map((s) => (
            <Link key={s.key} href={`/work#${s.key}`} className={`group rounded-2xl bg-white border border-slate-200 p-8 ${CARD_HOVER}`}>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-6 ${s.tint}`}><Icon name={s.icon} className="h-6 w-6" /></div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">{s.name}</p>
              <h3 className="text-2xl font-bold text-slate-900 mb-3">{s.headline}</h3>
              <p className="text-base text-slate-600 mb-6">{s.body}</p>
              <ul className="space-y-2 mb-6">
                {s.deliverables.slice(0, 3).map((d) => (
                  <li key={d} className="flex items-start gap-3 text-sm text-slate-700"><Icon name="check" className="h-5 w-5 flex-shrink-0 text-emerald-600" />{d}</li>
                ))}
              </ul>
              <span className="inline-flex items-center text-sm font-semibold text-slate-900">
                Details<Icon name="arrowRight" className="ml-1.5 h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function Solutions() {
  return (
    <section id="free" aria-labelledby="free-title" className="py-20 sm:py-24">
      <div className={WRAP}>
        <SectionHead eyebrow="Our own work" title="Two things we built and give away." id="free-title">
          They are how we work in public: the same verification-first approach we bring to client engagements. BigLaw is open
          source and free to run; Documents is shown as a sample walkthrough.
        </SectionHead>
        <div className="grid md:grid-cols-2 gap-6 lg:gap-8">
          {SOLUTIONS.map((f, i) => {
            const dark = i === 1;
            return (
              <div key={f.key} className={`rounded-2xl p-8 transition-all hover:-translate-y-1 ${dark
                ? 'bg-slate-900 text-white shadow-2xl shadow-slate-900/20' : 'bg-white border border-slate-200 hover:shadow-xl hover:shadow-slate-900/5'}`}>
                <div className="flex items-start justify-between mb-6">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${dark ? 'bg-white/10 text-white' : f.tint}`}><Icon name={f.icon} className="h-6 w-6" /></div>
                  <p className={`text-xs font-semibold ${dark ? 'text-slate-400' : 'text-slate-500'}`}>{f.status}</p>
                </div>
                <h3 className={`text-2xl font-bold mb-2 ${dark ? 'text-white' : 'text-slate-900'}`}>{f.name}</h3>
                <p className={`text-base mb-6 ${dark ? 'text-slate-300' : 'text-slate-600'}`}>{f.tagline}</p>
                <ul className="space-y-3 mb-8">
                  {f.points.map((p) => (
                    <li key={p} className="flex items-start gap-3">
                      <Icon name="check" className={`h-5 w-5 flex-shrink-0 mt-0.5 ${dark ? 'text-emerald-400' : 'text-emerald-600'}`} />
                      <span className={`text-sm ${dark ? 'text-slate-200' : 'text-slate-700'}`}>{p}</span>
                    </li>
                  ))}
                </ul>
                <Link href={f.href} className={`w-full inline-flex items-center justify-center px-5 py-3 rounded-lg font-semibold text-sm transition-all ${dark
                  ? 'bg-white text-slate-900 hover:bg-slate-100' : 'bg-slate-900 text-white hover:bg-slate-800'}`}>
                  {f.cta}<Icon name="arrowRight" className="ml-2 h-4 w-4" />
                </Link>
                {f.source && (
                  <a href={f.source} rel="noopener noreferrer" className="mt-3 w-full inline-flex items-center justify-center px-5 py-3 rounded-lg font-semibold text-sm border border-white/20 text-white hover:bg-white/10 transition-all">
                    <Icon name="code" className="mr-2 h-4 w-4" />Source on GitHub
                  </a>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Principles() {
  return (
    <section id="approach" aria-labelledby="approach-title" className="py-20 sm:py-24 bg-slate-50 border-y border-slate-200/70">
      <div className={WRAP}>
        <SectionHead eyebrow="How we work" title="The same rules for what we build and what we recommend." id="approach-title" />
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {PRINCIPLES.map((p) => (
            <div key={p.title} className="rounded-2xl bg-white border border-slate-200 p-6">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-4 ${p.tint}`}><Icon name={p.icon} className="h-5 w-5" /></div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">{p.title}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{p.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ResearchTeaser() {
  return (
    <section id="research" aria-labelledby="research-title" className="py-20 sm:py-24">
      <div className={`${WRAP} grid lg:grid-cols-12 gap-10 items-start`}>
        <div className="lg:col-span-5">
          <p className="text-sm font-semibold text-brand uppercase tracking-wider mb-3">Research</p>
          <h2 id="research-title" className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-slate-900 mb-4">Questions we are testing in public.</h2>
          <p className="text-lg text-slate-600 mb-6">
            Open experiments on how language models behave on legal tasks. Code, data pipeline and results are published as they
            exist, with their status stated plainly.
          </p>
          <Link href="/research" className="inline-flex items-center text-sm font-semibold text-slate-900">
            All research<Icon name="arrowRight" className="ml-1.5 h-4 w-4" />
          </Link>
        </div>
        <div className="lg:col-span-7 space-y-6">
          {RESEARCH.map((r) => (
            <Link key={r.key} href={`/research#${r.key}`} className={`group block rounded-2xl bg-white border border-slate-200 p-8 ${CARD_HOVER}`}>
              <p className="text-xs font-semibold text-slate-500 mb-3">{r.status}</p>
              <h3 className="text-2xl font-bold text-slate-900 mb-3">{r.title}</h3>
              <p className="text-base text-slate-600 mb-4">{r.question}</p>
              <span className="inline-flex items-center text-sm font-semibold text-slate-900">
                Read the design<Icon name="arrowRight" className="ml-1.5 h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function Faq() {
  return (
    <section id="faq" aria-labelledby="faq-title" className="py-20 sm:py-24">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 id="faq-title" className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 mb-10">Questions firms ask first.</h2>
        <dl className="divide-y divide-slate-200">
          {FAQS.map((f) => (
            <div key={f.q} className="py-6">
              <dt className="text-lg font-semibold text-slate-900 mb-2">{f.q}</dt>
              <dd className="text-base text-slate-600 leading-relaxed">{f.a}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

export default function Home() {
  return (
    <>
      <Hero />
      <Services />
      <Solutions />
      <Principles />
      <ResearchTeaser />
      <Faq />
      <ClosingCta />
    </>
  );
}
