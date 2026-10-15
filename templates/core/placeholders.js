'use strict';

/**
 * Generic detection of template placeholder tokens.
 *
 * Templates must render unknown values as visible fill-in blanks
 * ("____ (Draft — …)"), never as bracketed placeholders. A bracketed token
 * that reaches a download is a template bug: `[PETITIONER NAME]` or
 * `[PRIMARY RESIDENCE — set out the parent…]` printed into a court draft.
 *
 * Rather than a hand-maintained denylist of known tokens, a placeholder is
 * recognized by SHAPE: square brackets around an ALL-CAPS head of two or
 * more characters, optionally followed by an em/en-dash and a lowercase
 * instruction:
 *
 *   [CASE NUMBER]   [SUIT NUMBER]   [COURT REF. NUMBER]   [NUMBER]/[YEAR]
 *   [PRIMARY RESIDENCE — set out the parent with whom …]
 *
 * Not placeholders (never matched or explicitly allowed):
 *   - a single-letter checkbox mark such as "[X]" (head < 2 characters);
 *   - lowercase / sentence-case bracketed text ("[sic]", "[Print, type, or
 *     stamp commissioned name…]");
 *   - COURT_COMPLETED tokens — marks a court or notary fills in after the
 *     filer signs ([SEAL], [NOTARY SEAL], [JUDGE SIGNATURE]) and recitals
 *     the template deliberately leaves "TO BE COMPLETED BY THE COURT".
 */

// Head: starts with a capital, ALL-CAPS words/digits/punctuation, ends on a
// capital, digit, or ")". Optional " — instruction" tail up to the bracket.
const PLACEHOLDER_SOURCE = "\\[([A-Z][A-Z0-9 ,.'’&/()_-]*[A-Z0-9)])(?:\\s*[—–]\\s*([^\\]\\n]*))?\\]";

const COURT_COMPLETED = new Set([
  'DATE',
  'SEAL',
  'NOTARY SEAL',
  'NOTARY SEAL/STAMP',
  'JUDGE SIGNATURE',
  'LABEL',
]);

// Friendlier wording for the 422 message / UI prompt. Labels only — the
// DETECTION is generic; any head not listed is reported lowercased.
const FRIENDLY_LABELS = {
  MOVANT: 'movant name',
  DECLARANT: 'declarant name',
  COURT: 'court name',
  'BIRTH DATE': 'child birth date',
  DOB: 'date of birth',
  DISTRICT: 'judicial district',
  REGISTRY: 'registry',
  'DATE OF MARRIAGE': 'marriage date',
  'DATE OF SEPARATION': 'separation date',
  'COUNTY NAME': 'county',
  LENGTH: 'marriage length',
  AMOUNT: 'support amount',
  DURATION: 'support duration',
  PERIOD: 'separation period',
  SUBJECT: 'subject line',
};

function labelFor(head) {
  return FRIENDLY_LABELS[head] || head.toLowerCase();
}

function isCourtCompleted(head, instruction) {
  if (COURT_COMPLETED.has(head)) return true;
  return /TO BE COMPLETED BY THE COURT/.test(`${head} ${instruction || ''}`.toUpperCase());
}

/**
 * Every placeholder token in a string, excluding court-completed marks.
 * @param {string} text
 * @returns {Array<{token: string, head: string, instruction: string|null}>}
 */
function findPlaceholders(text) {
  if (typeof text !== 'string' || !text.includes('[')) return [];
  const out = [];
  const re = new RegExp(PLACEHOLDER_SOURCE, 'g');
  let m;
  while ((m = re.exec(text)) !== null) {
    const head = m[1].trim();
    const instruction = m[2] ? m[2].trim() : null;
    if (isCourtCompleted(head, instruction)) continue;
    out.push({ token: m[0], head, instruction });
  }
  return out;
}

/**
 * Human-readable missing-field labels for every placeholder found anywhere
 * in a built document structure (deduplicated, sorted). Serializing the
 * whole structure covers every section shape any template emits.
 * @param {*} structure
 * @returns {string[]}
 */
function findUnfilledPlaceholders(structure) {
  let serialized;
  try {
    serialized = JSON.stringify(structure);
  } catch {
    return [];
  }
  if (!serialized) return [];
  // JSON escapes newlines/quotes; the token grammar contains neither, so
  // scanning the serialized form is equivalent to scanning each string.
  const labels = new Set();
  for (const { head } of findPlaceholders(serialized)) {
    labels.add(labelFor(head));
  }
  return Array.from(labels).sort();
}

/**
 * Replace every placeholder in a string with a visible fill-in blank,
 * keeping any instruction as a Draft note. Used as the last line of
 * defence before a document is rendered to PDF/DOCX, where even
 * court-completed marks ([DATE], [SEAL], …) print as blanks to complete by
 * hand; only "… TO BE COMPLETED BY THE COURT" recitals are kept verbatim.
 * @param {string} text
 * @returns {string}
 */
function blankPlaceholders(text) {
  if (typeof text !== 'string' || !text.includes('[')) return text;
  return text.replace(new RegExp(PLACEHOLDER_SOURCE, 'g'), (token, head, instruction) => {
    if (/TO BE COMPLETED BY THE COURT/.test(`${head} ${instruction || ''}`.toUpperCase())) return token;
    return instruction && instruction.trim()
      ? `______________ (Draft — ${instruction.trim()})`
      : '______________';
  });
}

/**
 * blankPlaceholders applied to every string in a structure (objects and
 * arrays walked; other values untouched). The PDF/DOCX choke point and the
 * editor preview both use it, so the preview shows exactly the blanks the
 * download will.
 * @param {*} value
 * @returns {*}
 */
function blankPlaceholdersDeep(value) {
  if (typeof value === 'string') return blankPlaceholders(value);
  if (Array.isArray(value)) return value.map(blankPlaceholdersDeep);
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = blankPlaceholdersDeep(v);
    return out;
  }
  return value;
}

module.exports = {
  blankPlaceholdersDeep,
  PLACEHOLDER_SOURCE,
  COURT_COMPLETED,
  findPlaceholders,
  findUnfilledPlaceholders,
  blankPlaceholders,
};
