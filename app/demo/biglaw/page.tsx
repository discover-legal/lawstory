import type { Metadata } from 'next';
import { Icon } from '@/components/Icon';
import { SampleView } from '@/components/SampleView';
import { ClosingCta } from '@/components/SiteChrome';
import { biglawSample } from '@/content/samples/biglaw';
import { BIGLAW_REPO } from '@/content/site';

export const metadata: Metadata = { title: 'BigLaw sample', description: biglawSample.lede };

export default function BigLawSample() {
  return (
    <SampleView sample={biglawSample}>
      <section aria-labelledby="source-title" className="py-16 bg-slate-900">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <p className="text-xs font-semibold text-slate-400 mb-2">Free · Open source · Version 2 in development</p>
            <h2 id="source-title" className="text-2xl sm:text-3xl font-bold text-white mb-2">Run it yourself.</h2>
            <p className="text-slate-300">BigLaw is Apache-2.0: github.com/discover-legal/BigLaw.</p>
          </div>
          <a href={BIGLAW_REPO} rel="noopener noreferrer" className="inline-flex items-center justify-center px-6 py-3.5 rounded-xl font-semibold bg-white text-slate-900 hover:bg-slate-100 transition-all">
            <Icon name="code" className="mr-2 h-4 w-4" />Source on GitHub<Icon name="arrowRight" className="ml-2 h-4 w-4" />
          </a>
        </div>
      </section>
      <ClosingCta title="Or have us run it.">
        A managed BigLaw deployment on your infrastructure starts with a security review and authentication switched on. Prices on request.
      </ClosingCta>
    </SampleView>
  );
}
