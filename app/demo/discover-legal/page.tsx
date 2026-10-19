import type { Metadata } from 'next';
import { Cta } from '@/components/Cta';
import { SampleView } from '@/components/SampleView';
import { documentsSample } from '@/content/samples/discover-legal';

export const metadata: Metadata = { title: 'Documents sample', description: documentsSample.lede };

export default function DocumentsSample() {
  return (
    <SampleView sample={documentsSample}>
      <section className="section" aria-labelledby="next-title">
        <h2 id="next-title">Want this for your firm&apos;s intake?</h2>
        <Cta sample={false} />
      </section>
    </SampleView>
  );
}
