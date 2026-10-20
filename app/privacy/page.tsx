import type { Metadata } from 'next';
import { ProsePage } from '@/components/Prose';

export const metadata: Metadata = { title: 'Privacy Policy', description: 'What discover.legal collects: nothing on this site beyond standard server logs.' };

export default function PrivacyPage() {
  return (
    <ProsePage title="Privacy Policy" updated="October 2026"
      intro="This site is an information site. It has no accounts, no forms and no sign-in, and it saves nothing you do."
      sections={[
        { h: 'What this site collects', p: [
          'Nothing you type or click is stored by us: the site has no forms, and the sample walkthroughs run entirely in your browser from scripted, fictional content.',
          'Like any website, the hosting provider receives the technical details of each request (such as IP address, browser and the page requested) and keeps them in server logs for security and operations. We do not use them to build profiles of visitors.',
          'The site sets no cookies and loads no advertising or tracking scripts.'] },
        { h: 'When you email us', p: [
          'If you email us, we receive your address and whatever you choose to send, and use it only to reply and to scope any work you ask about. Please do not send confidential client information before an engagement is agreed.'] },
        { h: 'Links to other sites', p: [
          'Links to GitHub, a scheduling service or other sites take you to services with their own privacy policies.'] },
        { h: 'Questions and changes', p: [
          'Email us with any question about this policy or to ask what we hold about you. If this policy changes, the date at the top changes with it.'] },
      ]} />
  );
}
