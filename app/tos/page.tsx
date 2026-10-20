import type { Metadata } from 'next';
import { ProsePage } from '@/components/Prose';

export const metadata: Metadata = { title: 'Terms of Service', description: 'Terms for using the discover.legal website.' };

export default function TermsPage() {
  return (
    <ProsePage title="Terms of Service" updated="October 2026"
      intro="These terms cover your use of this website. Consultancy work is governed by the written agreement for that engagement."
      sections={[
        { h: 'Not legal advice', p: [
          'discover.legal is a legal technology consultancy, not a law firm. Nothing on this site is legal advice, and using the site does not create a lawyer-client relationship. For advice about your situation, speak to a licensed lawyer.'] },
        { h: 'The samples', p: [
          'The Documents and BigLaw walkthroughs are samples: fictional clients and matters with scripted output in the style of the products. They show how the software works; they are not live products, and their content must not be relied on or filed.'] },
        { h: 'Open-source software', p: [
          'BigLaw is published under the Apache License 2.0. That licence, not these terms, governs your use of the BigLaw source code, and like the licence says, it is provided without warranty.'] },
        { h: 'Site content', p: [
          'The site is provided as is. We work to keep it accurate, but we do not warrant that it is complete or current, and we are not liable for loss arising from reliance on it. Our names and logo may not be used to suggest endorsement without permission.'] },
        { h: 'Changes', p: ['We may update these terms; the date at the top shows the current version.'] },
      ]} />
  );
}
