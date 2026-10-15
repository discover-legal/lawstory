'use strict';

/**
 * Template placeholders as STRUCTURED MARKERS, never free text.
 *
 * A template that has no value for something emits `placeholder('PETITIONER
 * NAME')` (optionally with an instruction: `placeholder('PRIMARY RESIDENCE',
 * 'set out the parent …')`). The marker is the head wrapped in Unicode
 * private-use delimiters that no user, court or keyboard ever types, so:
 *
 *   - the generate / packet guards report ONLY real template gaps — a
 *     user's own "[REDACTED]", "[sic]", "[ON]" or "Smith v. Jones [ONCA]"
 *     is ordinary text and passes untouched;
 *   - the editor preview and the PDF/DOCX choke point turn each marker into
 *     the same visible fill-in blank (with the instruction as a Draft note)
 *     and never rewrite user text.
 *
 * Marker grammar:  U+E000 head [U+E002 instruction] U+E001
 *
 * Templates must not contain raw bracket placeholders; a source-scan test
 * (__tests__/templates/core/no-raw-placeholders.test.js) enforces it.
 */

const { FILL_BLANK, inlineDraftBlank } = require('./blanks');

const OPEN = '\uE000';
const SEP = '\uE002';
const CLOSE = '\uE001';
const MARKER_SOURCE = `${OPEN}([^${OPEN}${SEP}${CLOSE}]+)(?:${SEP}([^${OPEN}${SEP}${CLOSE}]*))?${CLOSE}`;

/**
 * Marks the court, a notary or the clerk fill in after the filer signs. They
 * print as blanks but never block a download.
 */
const COURT_COMPLETED = new Set([
  'DATE',
  'SEAL',
  'NOTARY SEAL',
  'NOTARY SEAL/STAMP',
  'JUDGE SIGNATURE',
  'LABEL',
]);

// Friendlier wording for the 422 message / UI prompt. Labels only; any head
// not listed is reported lowercased.
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

/**
 * The ONE way a template says "this value is missing".
 * @param {string} head - What is missing, e.g. 'PETITIONER NAME'
 * @param {string} [instruction] - What the filer should put there
 * @returns {string} A marker string, safe to concatenate and upper-case
 */
function placeholder(head, instruction) {
  const h = String(head).trim();
  const i = instruction == null ? '' : String(instruction).trim();
  return i ? `${OPEN}${h}${SEP}${i}${CLOSE}` : `${OPEN}${h}${CLOSE}`;
}

function isCourtCompleted(head) {
  return COURT_COMPLETED.has(String(head).trim().toUpperCase());
}

function labelFor(head) {
  const h = String(head).trim();
  return FRIENDLY_LABELS[h.toUpperCase()] || h.toLowerCase();
}

/**
 * Every placeholder marker in a string, excluding court-completed marks.
 * @param {string} text
 * @returns {Array<{marker: string, head: string, instruction: string|null}>}
 */
function findPlaceholders(text) {
  if (typeof text !== 'string' || !text.includes(OPEN)) return [];
  const out = [];
  const re = new RegExp(MARKER_SOURCE, 'g');
  let m;
  while ((m = re.exec(text)) !== null) {
    const head = m[1].trim();
    if (isCourtCompleted(head)) continue;
    out.push({ marker: m[0], head, instruction: m[2] ? m[2].trim() : null });
  }
  return out;
}

/**
 * Human-readable missing-field labels for every marker anywhere in a built
 * document structure (deduplicated, sorted). Only markers count — free text
 * the user wrote can never trip it.
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
  const labels = new Set();
  for (const { head } of findPlaceholders(serialized)) labels.add(labelFor(head));
  return Array.from(labels).sort();
}

/**
 * Replace every marker in a string with a visible fill-in blank, keeping any
 * instruction as a Draft note. Text outside markers is never touched.
 * @param {string} text
 * @returns {string}
 */
function blankPlaceholders(text) {
  if (typeof text !== 'string' || !text.includes(OPEN)) return text;
  return text.replace(new RegExp(MARKER_SOURCE, 'g'), (_m, _head, instruction) =>
    (instruction && instruction.trim() ? inlineDraftBlank(instruction.trim()) : FILL_BLANK));
}

/**
 * blankPlaceholders applied to every string in a structure. The PDF/DOCX
 * choke point and the editor preview both use it, so the preview shows
 * exactly the blanks the download will.
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
  placeholder,
  findPlaceholders,
  findUnfilledPlaceholders,
  blankPlaceholders,
  blankPlaceholdersDeep,
  COURT_COMPLETED,
  MARKER_SOURCE,
};
