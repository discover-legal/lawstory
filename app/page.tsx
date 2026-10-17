// Minimal real home (S1). The copy moves to content/site.ts and gains prices, the CTA and the demo
// links in S7, once those pages exist; this page links nowhere that does not exist yet.

const SERVICES = [
  {
    name: 'Buy',
    headline: 'Choose the right tools, on your terms.',
    body: 'Independent selection: what you need, which vendors deliver it, and what the contract should say about your data. No vendor referral fees.',
  },
  {
    name: 'Build',
    headline: 'Build what the market does not sell.',
    body: 'Client intake, document automation and AI-assisted workflows with human review gates. Code owns the rules, the model supplies language, and you own the code.',
  },
  {
    name: 'Run',
    headline: 'Managed operation on your infrastructure.',
    body: 'Hosting, monitoring, updates, backups and support for what we build or what you choose. Your data stays in your environment; you keep the keys.',
  },
  {
    name: 'Advise',
    headline: 'Technical leadership without the headcount.',
    body: 'Roadmap, AI use policy, build-versus-buy decisions and vendor negotiation support, on retainer or for a defined project.',
  },
] as const;

export default function Home() {
  return (
    <>
      <section className="hero" aria-labelledby="hero-title">
        <p className="kicker">Legal technology consultancy</p>
        <h1 id="hero-title">Technology your firm can trust, owned by your firm.</h1>
        <p className="lede">
          We help law firms buy, build, run and govern legal technology, and we show our work: two free
          products you can inspect before you talk to us.
        </p>
      </section>

      <section className="section" aria-labelledby="services-title">
        <h2 id="services-title">Services</h2>
        <ul className="grid grid-4">
          {SERVICES.map((s) => (
            <li key={s.name} className="card">
              <p className="kicker">{s.name}</p>
              <h3>{s.headline}</h3>
              <p className="muted">{s.body}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="section" aria-labelledby="demos-title">
        <h2 id="demos-title">Two free products, shown as demos</h2>
        <ul className="grid">
          <li className="card">
            <h3>discover.legal Documents (Ontario)</h3>
            <p className="muted">
              A step-through replay of one recorded AI interview with a fictional Ontario applicant, ending in
              watermarked draft documents. Nothing is typed, sent or saved.
            </p>
            <p className="status">Demo in preparation</p>
          </li>
          <li className="card">
            <h3>BigLaw</h3>
            <p className="muted">
              An open-source multi-agent platform for legal work, with a verification step on every finding.
              It is experimental and says so.
            </p>
            <p>
              <a href="https://github.com/discover-legal/BigLaw" rel="noopener noreferrer">Source on GitHub</a>
            </p>
          </li>
        </ul>
      </section>
    </>
  );
}
