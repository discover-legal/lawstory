import type { Metadata } from 'next';
import Link from 'next/link';
import ConsultancyNav from '@/components/marketing/consultancy/ConsultancyNav';
import ConsultancyFooter from '@/components/marketing/consultancy/ConsultancyFooter';
import ContactCta from '@/components/marketing/consultancy/ContactCta';

const pageTitle = 'Contact';
const pageDescription =
  'Talk to discover.legal about legal technology selection, custom builds, managed services or advisory for your firm.';
const pageUrl = 'https://discover.legal/contact';

export const metadata: Metadata = {
  title: pageTitle,
  description: pageDescription,
  alternates: { canonical: pageUrl },
  robots: { index: true, follow: true },
};

/**
 * Where every contact CTA lands before (or without) JavaScript. The address
 * itself is never in the served HTML (see ContactCta.tsx): with scripting the
 * button below opens the visitor's mail app; without it, the page says so
 * plainly and points to the free tools that need no contact at all.
 */
export default function ContactPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900 antialiased">
      <ConsultancyNav />

      <main id="contact" className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 sm:pt-20 pb-24">
        <p className="text-sm font-semibold text-brand uppercase tracking-wider mb-4">Contact</p>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-slate-900 leading-[1.05] mb-6">
          Talk to us.
        </h1>
        <p className="text-lg text-slate-600 leading-relaxed mb-10">
          Tell us about the problem, the firm and the constraints. A first conversation costs
          nothing, and you leave with our read on it.
        </p>

        <ContactCta variant="hero" />

        <noscript>
          <p className="mt-8 rounded-xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-700 leading-relaxed">
            Our email address is assembled in your browser so that spam bots cannot collect it,
            which needs JavaScript. Please enable JavaScript for this page and use the button
            above.
          </p>
        </noscript>

        <p className="mt-12 text-sm text-slate-600 leading-relaxed">
          Looking for the free tools instead? The{' '}
          <Link href="/tools/documents" className="font-semibold text-slate-900 underline underline-offset-2">
            document tools
          </Link>{' '}
          and the{' '}
          <Link href="/resources" className="font-semibold text-slate-900 underline underline-offset-2">
            guides
          </Link>{' '}
          need no account and no conversation.
        </p>
      </main>

      <ConsultancyFooter />
    </div>
  );
}
