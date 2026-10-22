'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon, type IconName } from '@/components/Icon';
import { useDemoDocument } from './DemoDocumentContext';
import { DOC_NAME, type SubDocument } from './engine';
import { paginate, type Block } from './paginate';

// The rendering half of components/app/DocumentPreview.js (c34b131): package tabs, zoom, WYSIWYG US
// Letter pages (broken where the draft's PDF breaks, from the recording), page counter and navigation. The product's <style> block and inline styles become
// Tailwind classes (this site's lint forbids both); zoom uses discrete classes, and phones start at
// 40% and desktops at 50% (the product used 65% and 80%) so a page fits its narrower column here. The refresh button is gone: the recorded
// engine re-renders on every turn.
const TABS: Record<SubDocument, { label: string; icon: IconName }> = { // Ontario's names, not v1's Petition/Decree
  divorce_petition: { label: DOC_NAME.divorce_petition, icon: 'fileText' }, divorce_decree: { label: DOC_NAME.divorce_decree, icon: 'scale' },
};
const DOWNLOADABLE = new Set<string>(['divorce_petition', 'divorce_decree']);
const tabsFor = (required?: string[]) => {
  const ok = (required ?? []).filter((d) => DOWNLOADABLE.has(d)) as SubDocument[];
  return ok.length ? ok : (['divorce_petition', 'divorce_decree'] as SubDocument[]);
};
const ZOOM: Record<number, string> = { 30: '[zoom:0.3]', 40: '[zoom:0.4]', 50: '[zoom:0.5]', 60: '[zoom:0.6]', 70: '[zoom:0.7]', 80: '[zoom:0.8]',
  90: '[zoom:0.9]', 100: '[zoom:1]', 110: '[zoom:1.1]', 120: '[zoom:1.2]', 130: '[zoom:1.3]', 140: '[zoom:1.4]', 150: '[zoom:1.5]' };
// services/pdfService.js's layout in CSS px (1pt = 4/3 px): Times 12pt body = 16px with lineGap 6 →
// 26px lines; moveDown(n) = n × 18px at 12pt; caption 12pt solid; titles 13–14pt bold, centred; first-line
// indent 36pt = 48px. Pages break where the PDF's do (recorded), so the type has to fill them the same way.
const CLASS: Record<string, string> = {
  filerBlock: 'mb-[25px] whitespace-pre-line text-[14.7px] leading-[19px]',
  header: 'mb-[30px] text-center text-[21px] font-bold', venue: 'mb-[28px] whitespace-pre-line text-center text-[18.7px] font-bold',
  caseCaption: 'mb-[18px] whitespace-pre-line border-b border-black pb-[27px] text-center leading-[18px]',
  title: 'mb-[31px] border-b border-black pb-[3px] text-center text-[18.7px] font-bold leading-[21px]',
  'section-title': 'mb-[16px] mt-[9px] text-center text-[17.3px] font-bold leading-[19px]',
  num: 'mb-[14px] pl-[22px] -indent-[22px] text-justify', 'num-d': 'mb-[11px] pl-[22px] -indent-[22px] text-justify',
  prose: 'mb-[26px] indent-[48px] text-justify', 'prose-d': 'mb-[11px] indent-[48px] text-justify', sub: 'mb-[14px] ml-[72px]',
  relief_intro: 'mb-[9px] indent-[48px] text-justify', relief_item: 'mb-[9px] ml-[48px] pl-[24px] -indent-[24px] text-justify',
  relief_more: 'mb-[9px] indent-[96px] text-justify', signature: 'my-[27px] whitespace-pre-line leading-[23px]',
  judgment: 'mt-[36px] whitespace-pre-line leading-[23px]',
};

function Section({ b }: { b: Block }) {
  // A paragraph the PDF carries over: no gap after the head, no first-line indent on the tail.
  const split = b.split === 'head' ? ' !mb-0' : b.split === 'tail' ? ' !indent-0' : '';
  return <div className={`${CLASS[b.type] ?? 'mb-[26px] whitespace-pre-line'}${b.bold ? ' font-bold' : ''}${split}`}>{b.content}</div>;
}

export function DocumentPreview() {
  const { currentDocument, preview, switchSubDocument } = useDemoDocument();
  const active = currentDocument.activeSubDocument;
  const [zoom, setZoom] = useState(() => (typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches ? 40 : 50));
  const [seen, setSeen] = useState({ sub: active, n: 1 });
  const currentPage = seen.sub === active ? seen.n : 1;
  const setCurrentPage = (n: number) => setSeen({ sub: active, n });
  const containerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);

  const pages = useMemo(() => (preview ? paginate(preview.sections, active, preview.breaks) : []), [preview, active]);
  const total = pages.length;

  useEffect(() => {
    const root = containerRef.current;
    if (!root || !total) return;
    const observer = new IntersectionObserver((entries) => {
      for (const e of entries) {
        const n = Number((e.target as HTMLElement).dataset.pageNumber);
        if (e.isIntersecting && n) setSeen((s) => ({ sub: s.sub, n }));
      }
    }, { root, threshold: [0.5], rootMargin: '-20% 0px -20% 0px' });
    pageRefs.current.slice(0, total).forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, [pages, total]);

  const goTo = (n: number) => { setCurrentPage(n); pageRefs.current[n - 1]?.scrollIntoView({ behavior: 'smooth', block: 'start' }); };

  if (!preview) {
    return (
      <div className="h-full flex flex-col bg-slate-50">
        <div className="p-4 border-b bg-white"><h2 className="text-lg font-semibold text-slate-800">Divorce Package Preview</h2></div>
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center max-w-md">
            <Icon name="fileText" className="h-16 w-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-700 mb-2">Your drafts appear here</h3>
            <p className="text-sm text-slate-500 mb-4">Once you give your name in the chat, your draft Application and Divorce Order appear here, formatted for Ontario, and update with every answer.</p>
          </div>
        </div>
      </div>
    );
  }

  const btn = 'p-2 hover:bg-slate-100 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
  return (
    <div className="h-full flex flex-col min-h-0 bg-slate-50">
      <div className="p-3 sm:p-4 border-b bg-white">
        <div className="mb-3 overflow-x-auto">
          <div className="inline-flex bg-slate-100 rounded-lg p-1" role="tablist" aria-label="Divorce package documents">
            {tabsFor(currentDocument.requiredDocuments).map((d) => (
              <button key={d} id={`divorce-tab-${d}`} type="button" role="tab" aria-selected={active === d} aria-controls="divorce-preview-panel"
                tabIndex={active === d ? 0 : -1} onClick={() => switchSubDocument(d)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium transition-all whitespace-nowrap ${active === d ? 'bg-brand text-white shadow-sm' : 'text-slate-600 hover:text-brand hover:bg-slate-50'}`}>
                <Icon name={TABS[d].icon} className="h-3.5 w-3.5" />{TABS[d].label}
              </button>
            ))}
          </div>
        </div>
        <div id="divorce-preview-panel" role="tabpanel" aria-labelledby={`divorce-tab-${active}`} className="flex items-center justify-between gap-2">
          <h2 className="text-base sm:text-lg font-semibold text-slate-800 flex items-center gap-2"><Icon name="fileText" className="h-5 w-5" />{TABS[active].label} Preview</h2>
          <div className="flex items-center gap-1 sm:gap-2">
            <button type="button" className={btn} title="Zoom out" aria-label="Zoom out" disabled={zoom <= 30} onClick={() => setZoom((z) => Math.max(z - 10, 30))}><Icon name="zoomOut" className="h-4 w-4" /></button>
            <span className="text-sm text-slate-600 min-w-[44px] text-center font-medium">{zoom}%</span>
            <button type="button" className={btn} title="Zoom in" aria-label="Zoom in" disabled={zoom >= 150} onClick={() => setZoom((z) => Math.min(z + 10, 150))}><Icon name="zoomIn" className="h-4 w-4" /></button>
          </div>
        </div>
      </div>
      <div ref={containerRef} className="flex-1 min-h-0 overflow-auto bg-slate-200 p-4 md:p-8">
        <div className={`mx-auto w-fit ${ZOOM[zoom]}`}>
          {pages.map((page, i) => (
            <div key={`${active}-${page.pageNumber}`} ref={(el) => { pageRefs.current[i] = el; }} data-page-number={page.pageNumber}
              className={`relative box-border h-[1056px] w-[816px] overflow-hidden bg-white p-24 font-times text-[16px] leading-[26px] text-black shadow-md ${i < total - 1 ? 'mb-8' : ''}`}>
              {page.content.map((b, j) => <Section key={j} b={b} />)}
              <div className="absolute bottom-[34px] left-1/2 -translate-x-1/2 whitespace-nowrap text-[13px] leading-none text-black">Page {page.pageNumber} of {total} • Created with Discover.Legal</div>
            </div>
          ))}
        </div>
      </div>
      <div className="p-3 sm:p-4 border-t bg-white">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 text-sm text-slate-600">
            <span>{total} page{total !== 1 ? 's' : ''}</span>
            {currentDocument.facts.length > 0 && <><span>•</span><span>{currentDocument.facts.length} fact{currentDocument.facts.length !== 1 ? 's' : ''}</span></>}
          </div>
          {total > 1 && (
            <div className="flex items-center gap-1 sm:gap-2">
              <button type="button" className={btn} title="Previous page" aria-label="Previous page" disabled={currentPage === 1} onClick={() => goTo(Math.max(1, currentPage - 1))}><Icon name="chevronLeft" className="h-4 w-4" /></button>
              <span className="px-2 sm:px-4 py-2 bg-slate-50 rounded text-sm font-medium">Page {currentPage} of {total}</span>
              <button type="button" className={btn} title="Next page" aria-label="Next page" disabled={currentPage === total} onClick={() => goTo(Math.min(total, currentPage + 1))}><Icon name="chevronRight" className="h-4 w-4" /></button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
