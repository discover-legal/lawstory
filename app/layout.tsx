import type { Metadata, Viewport } from 'next';
import { SiteFooter, SiteNav } from '@/components/SiteChrome';
import '@/styles/tokens.css';
// Visual direction: the restored marketing look (Tailwind, tailwind.config.ts); tokens supply the focus ring.
import '@/styles/directions/protocol.css';
import '@/styles/globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://discover.legal'),
  title: { default: 'discover.legal: legal technology consultancy', template: '%s | discover.legal' },
  description:
    'Legal technology consultancy for law firms and legal teams: selection, custom builds, managed services and advisory. BigLaw is free and open source; Documents is shown as a sample.',
  applicationName: 'discover.legal',
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-slate-900 antialiased">
        <a className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:bg-white focus:px-3 focus:py-2" href="#main">
          Skip to content
        </a>
        <SiteNav />
        <main id="main">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
