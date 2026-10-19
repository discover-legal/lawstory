import Link from 'next/link';
import { Cta } from '@/components/Cta';
import { BIGLAW_REPO } from '@/content/site';

export default function Home() {
  return (
    <>
      <section className="hero" aria-labelledby="hero-title">
        <p className="kicker">Legal technology for small firms</p>
        <h1 id="hero-title">AI that shows its evidence, built for lawyers who sign their work.</h1>
        <p className="lede">
          We build and run legal AI for solos, boutiques and small firms: client intake that turns a story into
          draft documents, and research that checks every quote against the source before a lawyer sees it.
        </p>
        <Cta />
      </section>

      <section className="section" aria-labelledby="products-title">
        <h2 id="products-title">What we build</h2>
        <ul className="grid">
          <li className="card">
            <p className="kicker">discover.legal Documents · Ontario family law</p>
            <h3>From a client&apos;s story to a draft, with every gap marked.</h3>
            <p className="muted">A guided interview collects the facts, keeps the client&apos;s own words as evidence, and drafts
              Ontario family-law documents. Nothing missing is invented: it becomes a Draft note.</p>
            <p className="status">Sample walkthrough only</p>
            <p><Link href="/demo/discover-legal">See the Documents sample</Link></p>
          </li>
          <li className="card">
            <p className="kicker">BigLaw · open source</p>
            <h3>Research agents whose quotes are checked.</h3>
            <p className="muted">Specialist agents work a matter; every quoted passage is matched against the documents, and
              unverified findings are excluded from the memo and disclosed in an Evidence Note.</p>
            <p className="status">Version 2 in development</p>
            <p><Link href="/demo/biglaw">See the BigLaw sample</Link> · <a href={BIGLAW_REPO} rel="noopener noreferrer">Source on GitHub</a></p>
          </li>
        </ul>
      </section>

      <section className="section" aria-labelledby="how-title">
        <h2 id="how-title">How we work</h2>
        <ol className="grid grid-4 plain">
          <li><h3>Code owns the rules</h3><p className="muted">Deadlines, grounds and vocabulary are checked in code, not left to a model.</p></li>
          <li><h3>Evidence first</h3><p className="muted">Every fact and quote points back to where it came from.</p></li>
          <li><h3>Gaps stay visible</h3><p className="muted">Silence is never turned into a waiver or an allegation.</p></li>
          <li><h3>You own it</h3><p className="muted">Open source, on your infrastructure, with your keys.</p></li>
        </ol>
        <p><Link href="/work">Our work and services</Link></p>
      </section>
    </>
  );
}
