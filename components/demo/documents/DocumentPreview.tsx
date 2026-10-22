'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon, type IconName } from '@/components/Icon';
import { useDemoDocument } from './DemoDocumentContext';
import { DOC_NAME, type SubDocument } from './engine';
import { PAGE, paginate, type Block, type Measure } from './paginate';

// The rendering half of components/app/DocumentPreview.js (c34b131): package tabs, zoom, WYSIWYG US
// Letter pages, page counter and navigation. The product's <style> block and inline styles become
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
const FONT = '"Times New Roman", Times, serif';
let canvas: HTMLCanvasElement | null = null; // one measuring canvas, created on first use (client only)
const PRE = 'm-0 whitespace-pre-wrap font-serif text-[16px]';
const CLASS: Record<string, string> = {
  filerBlock: 'mb-6 whitespace-pre-line', header: 'mb-4 text-center font-bold', venue: 'mb-4 whitespace-pre-line text-center',
  caseCaption: 'mb-4 whitespace-pre-line border-b-2 border-black pb-5 text-center',
  title: 'mb-6 border-b-2 border-black pb-3 text-center text-[18px] font-bold', 'section-title': 'mb-3 mt-9 font-bold underline',
  paragraph: 'mb-6 text-justify', relief_item: 'mb-[5px] ml-[0.5in] text-justify', 'preformatted-text': 'mb-6 whitespace-pre-line text-justify',
  continuation: 'mb-3 mt-6 text-center text-[15px] italic text-slate-700',
};

function Section({ b }: { b: Block }) {
  if (b.type === 'signature' || b.type === 'judgmentBlock' || b.type === 'footer') return <div className="mb-6 mt-12"><pre className={PRE}>{b.content}</pre></div>;
  if (b.type === 'verification') return <div className="mb-6 mt-12"><pre className={`${PRE} leading-6`}>{b.content}</pre></div>;
  if (b.type === 'paragraph' || b.type === 'relief_item') return <p className={CLASS[b.type]}>{b.content}</p>;
  return <div className={CLASS[b.type] ?? 'mb-6 indent-[0.5in] text-justify'}>{b.content}</div>;
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

  const pages = useMemo(() => {
    const measure: Measure = (text, fontSize, maxWidth, pre = false) => {
      canvas ??= document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return PAGE.lineHeight * Math.ceil(text.length / 80);
      ctx.font = `${fontSize}px ${FONT}`;
      const wrap = (line: string) => {
        let n = 0; let cur = '';
        for (const word of line.split(' ')) {
          const test = cur ? `${cur} ${word}` : word;
          if (ctx.measureText(test).width > maxWidth && cur) { n++; cur = word; } else cur = test;
        }
        return n + (cur ? 1 : 0);
      };
      const lines = pre ? text.split('\n').reduce((n, l) => n + (l.trim() === '' ? 1 : wrap(l)), 0) : wrap(text);
      return lines * PAGE.lineHeight;
    };
    return preview ? paginate(preview.sections, active, measure) : [];
  }, [preview, active]);
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
              className={`relative box-border h-[1056px] w-[816px] overflow-hidden bg-white p-24 font-serif text-[16px] leading-6 text-black shadow-md ${i < total - 1 ? 'mb-8' : ''}`}>
              {page.content.map((b, j) => <Section key={j} b={b} />)}
              <div className="absolute bottom-[0.5in] left-1/2 -translate-x-1/2 text-xs text-slate-500">Page {page.pageNumber} of {total}</div>
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
