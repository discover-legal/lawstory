/**
 * Jurisdiction-aware names for the two core divorce drafts and the filing
 * party, for UI chrome (chat greeting, preview tabs, download button and
 * filename, form labels).
 *
 * The vocabulary mirrors what the jurisdiction's templates actually title
 * the documents (`templates/states/<jurisdiction>/Divorce{Petition,Decree}Template.js`
 * `documentTitle`) and how they name the filing party, so the UI never
 * promises a "Petition" the draft calls an "Application". Templates are the
 * source of truth; keep this table in step when a template title changes.
 *
 * Everything not listed uses the US vocabulary (Petition / Decree /
 * Petitioner), which is what the US templates say.
 */

export interface DivorceDocLabels {
  /** Full name of the originating document, e.g. "Application for Divorce". */
  petition: string;
  /** Short tab label for the originating document, e.g. "Application". */
  petitionShort: string;
  /** Full name of the final order, e.g. "Divorce Order". */
  decree: string;
  /** Short tab label for the final order, e.g. "Divorce Order". */
  decreeShort: string;
  /** The party who files, e.g. "Applicant". */
  filingParty: string;
}

const US: DivorceDocLabels = {
  petition: 'Divorce Petition',
  petitionShort: 'Petition',
  decree: 'Divorce Decree',
  decreeShort: 'Decree',
  filingParty: 'Petitioner',
};

// Divorce Act provinces whose templates keep "Petition for Divorce" but whose
// final document is a "Divorce Order".
const CA_PETITION: DivorceDocLabels = {
  petition: 'Petition for Divorce',
  petitionShort: 'Petition',
  decree: 'Divorce Order',
  decreeShort: 'Divorce Order',
  filingParty: 'Petitioner',
};

const BY_JURISDICTION: Readonly<Record<string, DivorceDocLabels>> = {
  // Ontario: Family Law Rules — Application (Divorce), Divorce Order, Applicant.
  ON: {
    petition: 'Application for Divorce',
    petitionShort: 'Application',
    decree: 'Divorce Order',
    decreeShort: 'Divorce Order',
    filingParty: 'Applicant',
  },
  QC: {
    petition: 'Application for Divorce',
    petitionShort: 'Application',
    decree: 'Divorce Judgment',
    decreeShort: 'Judgment',
    filingParty: 'Applicant',
  },
  AB: {
    petition: 'Statement of Claim for Divorce',
    petitionShort: 'Statement of Claim',
    decree: 'Divorce Judgment',
    decreeShort: 'Judgment',
    filingParty: 'Plaintiff',
  },
  BC: {
    petition: 'Notice of Family Claim',
    petitionShort: 'Notice of Family Claim',
    decree: 'Divorce Order',
    decreeShort: 'Divorce Order',
    filingParty: 'Claimant',
  },
  NL: {
    ...CA_PETITION,
    petition: 'Originating Application (Family Law)',
    petitionShort: 'Application',
  },
  YT: {
    ...CA_PETITION,
    petition: 'Statement of Claim (Divorce)',
    petitionShort: 'Statement of Claim',
  },
  MB: CA_PETITION,
  NB: CA_PETITION,
  NS: CA_PETITION,
  NT: CA_PETITION,
  NU: CA_PETITION,
  PE: CA_PETITION,
  SK: CA_PETITION,
};

/** Labels for a jurisdiction code ("ON", "ut", …); US vocabulary otherwise. */
export function divorceDocLabels(jurisdiction?: string | null): DivorceDocLabels {
  const code = typeof jurisdiction === 'string' ? jurisdiction.trim().toUpperCase() : '';
  return BY_JURISDICTION[code] ?? US;
}

const PETITION_KINDS = new Set(['divorce_petition', 'petition_dissolution']);
const DECREE_KINDS = new Set(['divorce_decree']);

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
