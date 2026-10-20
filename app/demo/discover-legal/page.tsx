import type { Metadata } from 'next';
import { SampleView } from '@/components/SampleView';
import { ClosingCta } from '@/components/SiteChrome';
import { documentsSample } from '@/content/samples/discover-legal';

export const metadata: Metadata = { title: 'Documents sample', description: documentsSample.lede };

export default function DocumentsSample() {
  return (
    <SampleView sample={documentsSample}>
      <ClosingCta title="Want this for your firm’s intake?">
        We build intake like this for firms, on infrastructure they control: the interview, the fact record with its sources,
        and drafts in the vocabulary your court uses. Prices on request.
      </ClosingCta>
    </SampleView>
  );
}
