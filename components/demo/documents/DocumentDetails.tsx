'use client';

import { useDemoDocument } from './DemoDocumentContext';
import { PROVINCE } from './engine';

// Port of components/app/DocumentMetadata.js (c34b131), divorce branch, with Ontario's labels (Applicant,
// court location, Court File No.). In the product these were editable inputs; in the demo the draft only
// comes from the recording, so they are shown read-only, label above value so they fit a narrow column.
const fmt = (iso?: string) => (iso ? new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' }) : '');

export function DocumentDetails() {
  const { currentDocument: d } = useDemoDocument();
  const groups: [string, [string, string][]][] = [
    ['Parties', [
      ['Applicant', [d.petitionerFirstName, d.petitionerLastName].filter(Boolean).join(' ')],
      ['Respondent', [d.respondentFirstName, d.respondentLastName].filter(Boolean).join(' ')],
    ]],
    ['Court', [
      ['Jurisdiction', PROVINCE[d.state ?? ''] ?? d.state ?? ''],
      ['Court location', d.county ?? ''],
      ['Court File No.', d.caseNumber ?? ''],
    ]],
    ['Marriage', [['Date of marriage', fmt(d.marriageDate)], ['Date of separation', fmt(d.separationDate)]]],
  ];
  return (
    <div className="space-y-4 text-sm">
      <p className="rounded-lg bg-slate-100 px-3 py-2 text-xs leading-relaxed text-slate-600">
        In the product these fields are editable. In this recorded demo they fill in from the interview and are read-only.
      </p>
      {groups.map(([h, rows]) => (
        <section key={h}>
          <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">{h}</h3>
          <dl className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
            {rows.map(([label, value]) => (
              <div key={label} className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 px-3 py-2">
                <dt className="text-slate-600">{label}</dt>
                <dd className={`min-w-0 text-right ${value ? 'font-medium text-slate-900' : 'text-slate-400'}`}>{value || (label === 'Court File No.' ? 'Assigned by the court' : 'Not yet provided')}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </div>
  );
}
