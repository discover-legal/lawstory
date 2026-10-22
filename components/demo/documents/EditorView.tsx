'use client';

import { useState } from 'react';
import { Icon, type IconName } from '@/components/Icon';
import { ChatInterface } from './ChatInterface';
import { DemoDocumentProvider, partyDisplayName, useDemoDocument } from './DemoDocumentContext';
import { DocumentPreview } from './DocumentPreview';
import { DOC_NAME, PROVINCE, REC, TURNS } from './engine';
import { FactsSidebar } from './FactsSidebar';

// Port of components/app/EditorView.js (c34b131): header with the download button and document info
// bar, a three-panel desktop layout (chat / preview / facts) and the tabbed phone layout. Removed for the
// demo: auth, save/autosave, payment, the review gate, firm mode, the resizable panes (fixed 30/40/30)
// and the server PDF call. Download hands over the draft PDF the product rendered for the finished
// recording (public/drafts), so it is enabled once the recorded interview is complete. Added: Reset.
type Panel = 'chat' | 'preview' | 'validation';
const PANELS: [Panel, string, IconName][] = [['chat', 'Chat', 'messageSquare'], ['preview', 'Preview', 'eye'], ['validation', 'Facts', 'listChecks']];

function Editor() {
  const { currentDocument: d, step, session, reset } = useDemoDocument();
  const [activePanel, setActivePanel] = useState<Panel>('chat');
  const done = step >= TURNS;
  const pdf = REC.pdfs[d.activeSubDocument];
  const name = partyDisplayName(d);
  const label = `Download ${DOC_NAME[d.activeSubDocument]} draft`;
  const dl = 'flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 rounded-lg text-sm text-white transition-colors';

  const panel = (p: Panel) => (p === 'chat' ? <ChatInterface /> : p === 'preview' ? <DocumentPreview /> : <FactsSidebar />);
  return (
    <div className="flex h-[calc(100dvh-6rem)] min-h-[560px] max-h-[920px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
      <header className="flex-shrink-0 border-b bg-white px-3 py-3 sm:px-6 sm:py-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center">
            <Icon name="scale" className="mr-2 h-5 w-5 flex-shrink-0 text-brand sm:h-6 sm:w-6" />
            <h2 className="truncate text-base font-semibold sm:text-xl">New Divorce Package</h2>
          </div>
          <div className="flex flex-shrink-0 items-center gap-1 sm:gap-2">
            <button type="button" onClick={() => { reset(); setActivePanel('chat'); }} aria-label="Reset demo"
              className="flex items-center gap-1 rounded-lg border border-slate-300 px-2 py-2 text-sm text-slate-700 hover:bg-slate-50 sm:gap-2 sm:px-4">
              <Icon name="rotateCcw" className="h-4 w-4" /><span className="hidden sm:inline">Reset</span>
            </button>
            {done ? (
              <a href={pdf.href} download aria-label={label} className={`${dl} bg-emerald-700 hover:bg-emerald-800`}>
                <Icon name="download" className="h-4 w-4" /><span className="hidden sm:inline">{label}</span>
              </a>
            ) : (
              <button type="button" disabled aria-label="Download draft (available when the recorded interview is complete)"
                title="Available when the recorded interview is complete" className={`${dl} cursor-not-allowed bg-emerald-700 opacity-50`}>
                <Icon name="download" className="h-4 w-4" /><span className="hidden sm:inline">{label}</span>
              </button>
            )}
          </div>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-6 gap-y-1 text-xs text-slate-600 sm:mt-3 sm:text-sm">
          <span className="min-w-0 truncate"><span className="hidden sm:inline">Document: </span>
            <span className="font-medium">{name || 'Unnamed'}{d.state && ` · ${PROVINCE[d.state] ?? d.state}`}</span></span>
          {d.facts.length > 0 && <span>Facts: <span className="font-medium">{d.facts.length}</span></span>}
          <span>Turn: <span className="font-medium">{step} of {TURNS}</span></span>
        </div>
      </header>

      <div className="flex border-b bg-white md:hidden" role="tablist" aria-label="Editor panels">
        {PANELS.map(([p, label, icon]) => (
          <button key={p} id={`editor-tab-${p}`} type="button" role="tab" aria-selected={activePanel === p} aria-controls={`editor-panel-${p}`}
            tabIndex={activePanel === p ? 0 : -1} onClick={() => setActivePanel(p)}
            className={`flex-1 border-b-2 px-2 py-2 text-xs font-medium transition-colors ${activePanel === p ? 'border-brand bg-brand-tint text-brand' : 'border-transparent text-slate-600 hover:bg-slate-50 hover:text-brand'}`}>
            <Icon name={icon} className="mx-auto mb-1 h-5 w-5" /><span className="block">{label}</span>
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1 md:grid md:grid-cols-[minmax(0,3fr)_minmax(0,4fr)_minmax(0,3fr)]">
        {PANELS.map(([p], i) => (
          <div key={`${p}-${session}`} id={`editor-panel-${p}`} role="tabpanel" aria-labelledby={`editor-tab-${p}`}
            className={`${activePanel === p ? 'flex' : 'hidden'} h-full min-h-0 flex-col md:flex ${i < 2 ? 'md:border-r' : ''}`}>
            {panel(p)}
          </div>
        ))}
      </div>
    </div>
  );
}

export function DocumentsDemo() {
  return <DemoDocumentProvider><Editor /></DemoDocumentProvider>;
}
