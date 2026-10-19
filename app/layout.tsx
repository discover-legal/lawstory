import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
import { EMAIL_SPELLED, NAV } from '@/content/site';
import '@/styles/tokens.css';
// Visual direction: Protocol (verification-first; colour only means status). README "Visual direction".
import '@/styles/directions/protocol.css';
import '@/styles/globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://discover.legal'),
  title: { default: 'discover.legal: legal AI for small firms', template: '%s | discover.legal' },
  description:
    'We build legal AI that shows its evidence: Ontario family-law document prep (sample) and BigLaw, open-source research agents for small firms.',
  applicationName: 'discover.legal',
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a className="skip" href="#main">Skip to content</a>
        <header className="site-head">
          <div className="wrap">
            <Link className="mark" href="/">discover.legal</Link>
            <nav aria-label="Main"><ul className="nav">{NAV.map((n) => <li key={n.href}><Link href={n.href}>{n.label}</Link></li>)}</ul></nav>
          </div>
        </header>
        <main id="main" className="wrap">{children}</main>
        <footer className="site-foot">
          <div className="wrap">
            <p id="contact">Contact: {EMAIL_SPELLED}.</p>
            <p>discover.legal is a legal technology consultancy, not a law firm, and does not give legal advice.
              The site has no accounts and saves nothing you do.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
