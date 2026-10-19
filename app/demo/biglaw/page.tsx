import type { Metadata } from 'next';
import { Cta } from '@/components/Cta';
import { SampleView } from '@/components/SampleView';
import { biglawSample } from '@/content/samples/biglaw';
import { BIGLAW_REPO } from '@/content/site';

export const metadata: Metadata = { title: 'BigLaw sample', description: biglawSample.lede };

export default function BigLawSample() {
  return (
    <SampleView sample={biglawSample}>
      <section className="section" aria-labelledby="next-title">
        <h2 id="next-title">Run it yourself, or have us run it</h2>
        <p>BigLaw is open source: <a href={BIGLAW_REPO} rel="noopener noreferrer">github.com/discover-legal/BigLaw</a>. Version 2 is in development.</p>
        <Cta sample={false} />
      </section>
    </SampleView>
  );
}
