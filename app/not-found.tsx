import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Page not found' };

export default function NotFound() {
  return (
    <section className="hero" aria-labelledby="nf-title">
      <p className="kicker">404</p>
      <h1 id="nf-title">This page does not exist.</h1>
      <p className="lede">
        Some older pages were retired with the site rewrite. <Link href="/">Go to the home page</Link>.
      </p>
    </section>
  );
}
