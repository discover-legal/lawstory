/**
 * Jurisdiction-aware names for the two core divorce drafts and the parties,
 * for UI chrome (chat greeting, preview tabs, download button and filename,
 * form labels, placeholders).
 *
 * The data is DERIVED from the templates (`scripts/buildDivorceDocLabels.js`
 * reads each jurisdiction's DivorcePetitionTemplate / DivorceDecreeTemplate
 * `documentTitle` and party vocabulary) into `divorceDocLabels.data.json`,
 * so the UI calls a document exactly what the draft calls it — Ontario:
 * Application for Divorce / Divorce Order / Applicant; Georgia: Complaint
 * for Divorce / Final Judgment and Decree of Divorce / Plaintiff v.
 * Defendant. A test re-derives the data and fails on drift.
 */
import DATA from './divorceDocLabels.data.json';

export interface DivorceDocLabels {
  /** Full name of the originating document, e.g. "Application for Divorce". */
  petition: string;
  /** Short tab label for the originating document, e.g. "Application". */
  petitionShort: string;
  /** Full name of the final order, e.g. "Divorce Order". */
  decree: string;
  /** Short tab label for the final order, e.g. "Divorce Order". */
  decreeShort: string;
  /** The party who files, e.g. "Applicant" / "Plaintiff". */
  filingParty: string;
  /** The other party, e.g. "Respondent" / "Defendant". */
  respondingParty: string;
  /** The caption's case-number label, e.g. "Court File No."; null when unknown. */
  caseNumberLabel: string | null;
  /** Jurisdiction display name ("Ontario"); null when unknown. */
  name: string | null;
  /** ISO country code ("CA", "US"); null when unknown. */
  country: string | null;
}

/** Used when the jurisdiction is unknown or has no divorce templates. */
const DEFAULT: DivorceDocLabels = {
  petition: 'Divorce Petition',
  petitionShort: 'Petition',
  decree: 'Divorce Decree',
  decreeShort: 'Decree',
  filingParty: 'Petitioner',
  respondingParty: 'Respondent',
  caseNumberLabel: null,
  name: null,
  country: null,
};

const BY_JURISDICTION = DATA as Record<string, Omit<DivorceDocLabels, 'caseNumberLabel'> & { caseNumberLabel: string | null }>;

/** Labels for a jurisdiction code ("ON", "ut", …); generic US terms otherwise. */
export function divorceDocLabels(jurisdiction?: string | null): DivorceDocLabels {
  const code = typeof jurisdiction === 'string' ? jurisdiction.trim().toUpperCase() : '';
  const found = code ? BY_JURISDICTION[code] : undefined;
  return found ? { ...DEFAULT, ...found } : DEFAULT;
}

const PETITION_KINDS = new Set(['divorce_petition', 'petition_dissolution']);
const DECREE_KINDS = new Set(['divorce_decree', 'judgment_dissolution']);

/**
 * Jurisdiction-aware label for a divorce sub-document key, or null when the
 * key is not one of the two core drafts (callers keep their own label).
 */
export function divorceSubDocLabel(
  subDocument: string | null | undefined,
  jurisdiction: string | null | undefined,
  { short = false }: { short?: boolean } = {},
): string | null {
  if (!subDocument) return null;
  const labels = divorceDocLabels(jurisdiction);
  if (PETITION_KINDS.has(subDocument)) return short ? labels.petitionShort : labels.petition;
  if (DECREE_KINDS.has(subDocument)) return short ? labels.decreeShort : labels.decree;
  return null;
}

/** "Application for Divorce" → "application-for-divorce" (download filenames). */
export function labelSlug(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
