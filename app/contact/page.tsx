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

const STATUS_COPY: Record<string, { tone: 'ok' | 'error'; text: string }> = {
  sent: { tone: 'ok', text: 'Thank you. Your message is with us, and we will reply by email.' },
  invalid: { tone: 'error', text: 'Please give your name, a valid email address and a message.' },
  busy: { tone: 'error', text: 'Too many messages from this connection just now. Please try again in an hour.' },
  error: { tone: 'error', text: 'Your message could not be saved. Please try again.' },
};

const field =
  'mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10';

/**
 * Where every contact CTA lands before (or without) JavaScript. The address
 * itself is never in the served HTML (see ContactCta.tsx). With scripting
 * the button opens the visitor's mail app; the form below works either way
 * (plain HTML POST to /api/contact).
 */
export default async function ContactPage({
  searchParams,
}: {
  searchParams?: Promise<{ status?: string }>;
}) {
  const status = (await searchParams)?.status;
  const notice = status ? STATUS_COPY[status] : undefined;

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

        <ContactCta variant="hero" fallbackHref="#contact-form" />

        <section id="contact-form" className="mt-12 rounded-2xl border border-slate-200 bg-slate-50 p-6 sm:p-8">
          <h2 className="text-xl font-bold text-slate-900">Or send a message here</h2>
          <p className="mt-1 text-sm text-slate-600">
            Works without JavaScript. We read every message and reply by email.
          </p>

          {notice && (
            <p
              role={notice.tone === 'ok' ? 'status' : 'alert'}
              className={`mt-4 rounded-lg border px-4 py-3 text-sm ${
                notice.tone === 'ok'
                  ? 'border-green-200 bg-green-50 text-green-800'
                  : 'border-red-200 bg-red-50 text-red-800'
              }`}
            >
              {notice.text}
            </p>
          )}

          {status !== 'sent' && (
            <form method="post" action="/api/contact" className="mt-6 space-y-4">
              <div>
                <label htmlFor="contact-name" className="text-sm font-medium text-slate-800">Your name</label>
                <input id="contact-name" name="name" required maxLength={200} autoComplete="name" className={field} />
              </div>
              <div>
                <label htmlFor="contact-email" className="text-sm font-medium text-slate-800">Your email</label>
                <input id="contact-email" name="email" type="email" required maxLength={254} autoComplete="email" className={field} />
              </div>
              <div>
                <label htmlFor="contact-message" className="text-sm font-medium text-slate-800">Message</label>
                <textarea id="contact-message" name="message" required maxLength={5000} rows={6} className={field} />
              </div>
              {/* Honeypot: hidden from people and assistive tech. */}
              <div aria-hidden="true" className="hidden">
                <label htmlFor="contact-website">Website</label>
                <input id="contact-website" name="website" tabIndex={-1} autoComplete="off" />
              </div>
              <button
                type="submit"
                className="inline-flex items-center px-5 py-3 rounded-lg font-semibold text-sm bg-slate-900 text-white hover:bg-slate-800 transition-colors"
              >
                Send message
              </button>
            </form>
          )}
        </section>

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
