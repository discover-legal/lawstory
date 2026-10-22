'use client';

import { Icon } from '@/components/Icon';
import { partyDisplayName, useDemoDocument } from './DemoDocumentContext';

// Port of components/app/ValidationSidebar.js (c34b131), divorce branch: the read-only "Divorce Facts"
// list and the Requirements checklist. The product's per-fact edit/delete buttons are left out: the
// draft here only comes from the recording, so an edit could not change it.
function Requirement({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <div className="flex items-center text-sm">
      <Icon name={ok ? 'circleCheck' : 'circleX'} className={`h-4 w-4 mr-2 ${ok ? 'text-emerald-600' : 'text-slate-300'}`} />
      <span className={ok ? 'text-slate-700' : 'text-slate-400'}>{children}</span>
    </div>
  );
}

export function FactsSidebar() {
  const { currentDocument: d } = useDemoDocument();
  const n = d.facts.length;
  return (
    <div className="h-full flex flex-col min-h-0 bg-white">
      <div className="p-4 border-b border-slate-200">
        <h3 className="text-lg font-semibold text-slate-900">Divorce Facts</h3>
        <p className="text-sm text-slate-600 mt-2">{n} fact{n !== 1 ? 's' : ''}</p>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
        {n > 0 ? d.facts.map((f, i) => (
          <div key={`${i}-${f.content}`} className="p-3 border border-slate-200 rounded-lg bg-slate-50">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-medium text-slate-500">#{i + 1}</span>
              {f.category && <span className="text-xs px-2 py-0.5 bg-brand-soft text-brand-strong rounded">{f.category}</span>}
            </div>
            <p className="text-sm text-slate-800">{f.content}</p>
          </div>
        )) : (
          <div className="text-center text-slate-500 py-8">
            <Icon name="info" className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No divorce facts added yet</p>
            <p className="text-xs mt-1">Start chatting to add facts about your divorce</p>
          </div>
        )}
      </div>
      <div className="p-4 border-t border-slate-200 bg-slate-50">
        <h4 className="text-sm font-medium text-slate-700 mb-2">Requirements</h4>
        <div className="space-y-1">
          <Requirement ok={!!partyDisplayName(d)}>Name provided</Requirement>
          <Requirement ok={!!d.state}>Jurisdiction set</Requirement>
          <Requirement ok={n >= 3}>At least 3 facts ({n}/3)</Requirement>
        </div>
      </div>
    </div>
  );
}
