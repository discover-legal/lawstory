'use client';

import { useDemoDocument } from './DemoDocumentContext';

// Port of components/app/DocumentMetadata.js (c34b131), divorce branch. In the product these were
// editable inputs; in the demo the draft only comes from the recording, so they are shown read-only.
const fmt = (iso?: string) => (iso ? new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' }) : '');

export function DocumentDetails() {
  const { currentDocument: d } = useDemoDocument();
  const rows: [string, string, string][] = [
    ['Basic Information', 'Petitioner First Name', d.petitionerFirstName ?? ''],
    ['Basic Information', 'Petitioner Last Name', d.petitionerLastName ?? ''],
    ['Basic Information', 'Respondent First Name', d.respondentFirstName ?? ''],
    ['Basic Information', 'Respondent Last Name', d.respondentLastName ?? ''],
    ['Basic Information', 'Jurisdiction', d.state ?? 'Established from your interview'],
    ['Basic Information', 'County', d.county ?? ''],
    ['Case Information', 'Case Number', d.caseNumber ?? ''],
    ['Case Information', 'Date of Marriage', fmt(d.marriageDate)],
    ['Case Information', 'Date of Separation', fmt(d.separationDate)],
  ];
  return (
    <div className="space-y-5 text-sm">
      <p className="rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-600">
        In the product these fields are editable. In this recorded demo they fill in from the interview and are read-only.
      </p>
      {['Basic Information', 'Case Information'].map((h) => (
        <section key={h}>
          <h3 className="mb-2 text-base font-semibold text-slate-900">{h}</h3>
          <dl className="divide-y divide-slate-200 rounded-lg border border-slate-200">
            {rows.filter((r) => r[0] === h).map(([, label, value]) => (
              <div key={label} className="grid grid-cols-2 gap-2 px-3 py-2">
                <dt className="font-medium text-slate-700">{label}</dt>
                <dd className={value ? 'text-slate-900' : 'text-slate-400'}>{value || 'Not yet provided'}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </div>
  );
}
