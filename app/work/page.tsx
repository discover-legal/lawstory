import type { Metadata } from 'next';
import { Cta } from '@/components/Cta';
import { SERVICES, WORK, price } from '@/content/site';

export const metadata: Metadata = { title: 'Work', description: 'What the discover.legal team builds, its honest status, and consultancy services.' };

export default function WorkPage() {
  return (
    <>
      <section className="hero" aria-labelledby="work-title">
        <p className="kicker">Work</p>
        <h1 id="work-title">What we build, and where it stands.</h1>
        <p className="lede">Two products, stated as they are today, and the consultancy that funds them.</p>
      </section>
      <section className="section" aria-labelledby="products-title">
        <h2 id="products-title">Products</h2>
        <ul className="grid">
          {WORK.map((w) => (
            <li key={w.name} className="card">
              <h3>{w.name}</h3>
              <p className="status">{w.status}</p>
              <p className="muted">{w.body}</p>
              <p>{w.links.map((l, i) => <span key={l.href}>{i > 0 && ' · '}<a href={l.href}>{l.label}</a></span>)}</p>
            </li>
          ))}
        </ul>
      </section>
      <section className="section" aria-labelledby="services-title">
        <h2 id="services-title">Consultancy</h2>
        <p className="muted">We are a technology consultancy, not a law firm, and we do not give legal advice.</p>
        <ul className="grid grid-4">
          {SERVICES.map((s) => (
            <li key={s.name} className="card">
              <p className="kicker">{s.name}</p>
              <h3>{s.headline}</h3>
              <p className="muted">{s.body}</p>
              <p className="price">{price(s.price)}</p>
            </li>
          ))}
        </ul>
        <Cta />
      </section>
    </>
  );
}
