import type { Metadata } from 'next';
import { DocumentsDemo } from '@/components/demo/documents/EditorView';
import { Icon } from '@/components/Icon';
import { PageHero } from '@/components/PageHero';
import { ClosingCta, WRAP } from '@/components/SiteChrome';

const LEDE = 'The real Documents interface, Ontario: type in the interview, watch the facts fill in, read the draft Application and Divorce Order, and download them.';
export const metadata: Metadata = { title: 'Documents demo', description: LEDE };

const DISCLOSURE = 'Recorded demo: a fictional client (Priya Nair) and a fixed recording, not live AI. It is not legal advice. Nothing you type is sent anywhere or saved; it stays in this browser tab until you reset or leave.';

const HOW: [string, string][] = [
  ['The interface', 'The product’s editor, ported from the app: the interview chat, Document Details, the facts list, and the paginated draft preview with its Application and Divorce Order tabs. Accounts, payment, saving and evidence upload are taken out.'],
  ['The drafts', 'Every word of the preview and the PDFs is produced by the product’s own Ontario templates and PDF renderer, run over the recorded facts. Nothing in a draft was written for this page. Four template fixes this demo found (Ontario debt wording, the parenting schedule, the children list, page breaks) are applied to the product’s code as a patch, not to the drafts.'],
  ['The replies', 'There is no recorded live-model run of an Ontario interview to replay, so the assistant’s replies were scripted for this recording from the product’s Ontario interview questions, and the product’s interview code turned each turn into facts and the next phase. Your words are matched to the nearest recorded answer; anything off-script gets the recorded question again.'],
];

export default function DocumentsDemoPage() {
  return (
    <>
      <PageHero eyebrow="Live demo · Ontario" title="discover.legal Documents">
        <p className="mb-6">{LEDE}</p>
        <p role="note" className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <Icon name="eye" className="h-5 w-5 flex-shrink-0 text-amber-600" />{DISCLOSURE}
        </p>
      </PageHero>
      <div className={`${WRAP} pb-12`}>
        <DocumentsDemo />
      </div>
      <section className={`${WRAP} pb-20`} aria-labelledby="how-title">
        <h2 id="how-title" className="text-2xl font-bold tracking-tight text-slate-900 mb-6">How this demo works</h2>
        <dl className="grid gap-4 md:grid-cols-3">
          {HOW.map(([t, d]) => (
            <div key={t} className="rounded-xl border border-slate-200 bg-slate-50 p-5">
              <dt className="font-semibold text-slate-900 mb-2">{t}</dt>
              <dd className="text-sm text-slate-600 leading-relaxed">{d}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-sm text-slate-500">Drafts are source material: in Ontario, file on the official court forms.</p>
      </section>
      <ClosingCta title="Want this for your firm’s intake?">
        We build intake like this for firms, on infrastructure they control: the interview, the fact record with its sources,
        and drafts in the vocabulary your court uses. Prices on request.
      </ClosingCta>
    </>
  );
}
