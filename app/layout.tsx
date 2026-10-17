import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
import '@/styles/tokens.css';
// Visual direction: none picked yet. Picking one is this single line, e.g.
// import '@/styles/directions/protocol.css';
import '@/styles/globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://discover.legal'),
  title: { default: 'discover.legal: legal technology consultancy', template: '%s | discover.legal' },
  description:
    'Legal technology consultancy for law firms: independent selection, client-owned software, managed operation and fractional technical leadership.',
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
          </div>
        </header>
        <main id="main" className="wrap">{children}</main>
        <footer className="site-foot">
          <div className="wrap">
            <p>discover.legal is a legal technology consultancy, not a law firm, and does not give legal advice.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
