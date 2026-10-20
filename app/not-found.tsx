import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHero } from '@/components/PageHero';

export const metadata: Metadata = { title: 'Page not found' };

export default function NotFound() {
  return (
    <PageHero eyebrow="404" title="This page does not exist.">
      <p className="pb-12">Some older pages were retired with the site rewrite.{' '}
        <Link href="/" className="font-semibold text-brand hover:text-brand-strong">Go to the home page</Link>.</p>
    </PageHero>
  );
}
