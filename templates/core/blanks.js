'use strict';

/**
 * Shared "unknown is a visible blank" helpers for pleading templates.
 *
 * v5.1.0 safety rule: silence in the transcript must never become an
 * allegation. When the intake did not affirmatively establish a fact, the
 * template renders a fill-in rule plus a "(Draft — …)" note telling the
 * filer what to state — never a sworn assertion, and never a literal
 * `[TOKEN]` placeholder (which the generate route rejects with 422 and the
 * PDF layer would otherwise print).
 */

/** The fill-in rule every Draft-note blank opens with. */
const DRAFT_RULE = '________________________________________';

/** Fill-in blank used for a case / file / docket number not yet assigned. */
const CASE_NUMBER_BLANK = '____________________';

/**
 * A visible Draft-note blank: a fill-in rule followed by the instruction.
 * @param {string} instruction - What the filer must state, without the
 *   leading "Draft — " or the surrounding parentheses.
 * @returns {string}
 */
function draftBlank(instruction) {
  return `${DRAFT_RULE}\n(Draft — ${instruction})`;
}

/**
 * An inline fill-in blank for a value inside a sentence (a name, an
 * arrangement), followed by its Draft note.
 * @param {string} instruction - What the filer must fill in.
 * @returns {string}
 */
function inlineDraftBlank(instruction) {
  return `__________________________ (Draft — ${instruction})`;
}

/**
 * The parent the children primarily reside with, for an order: the
 * recorded name, or an inline blank — never a default to the filer.
 * @param {string|null|undefined} residenceName - resolvePrimaryResidenceName()
 * @returns {string}
 */
function primaryResidenceOrBlank(residenceName) {
  return residenceName || inlineDraftBlank('name the parent with whom the child(ren) will primarily reside');
}

/**
 * The LLM extraction layer occasionally lands literal "null" / "undefined"
 * / "N/A" / punctuation-only values in a slot that should be empty. Treat
 * them as absent so a caption never reads "Case No. null" or "Case No. .".
 * @param {*} value
 * @returns {string} The trimmed case number, or '' when absent.
 */
function sanitizeCaseNumber(value) {
  if (value == null) return '';
  const s = String(value).trim();
  if (!s) return '';
  const lower = s.toLowerCase();
  if (lower === 'null' || lower === 'undefined' || lower === 'n/a' || lower === 'none') return '';
  if (!/[A-Za-z0-9]/.test(s)) return '';
  return s;
}

/**
 * Case / file / docket number for a caption: the real number when present,
 * otherwise a fill-in blank (the court assigns it at filing). One helper so
 * every jurisdiction renders an unassigned number the same way.
 * @param {*} value - The raw case number from the case data.
 * @param {string} [blank] - Override the blank (rarely needed).
 * @returns {string}
 */
function caseNumberOrBlank(value, blank = CASE_NUMBER_BLANK) {
  return sanitizeCaseNumber(value) || blank;
}

/**
 * Whether either party is currently pregnant, as affirmatively recorded.
 * `eitherPartyPregnant` is the neutral field; `wifePregnant` is the legacy
 * Florida alias. Anything other than a boolean is unknown.
 * @param {Object} data
 * @returns {'pregnant'|'not_pregnant'|'unknown'}
 */
function pregnancyStatus(data = {}) {
  const raw = data.eitherPartyPregnant !== undefined && data.eitherPartyPregnant !== null
    ? data.eitherPartyPregnant
    : data.wifePregnant;
  if (raw === true) return 'pregnant';
  if (raw === false) return 'not_pregnant';
  return 'unknown';
}

/**
 * The pregnancy averment many petitions carry (e.g. RSMo § 452.310.2(5)
 * requires the petition to state it). It renders a sworn statement ONLY
 * from an affirmative recorded answer; otherwise a gender-neutral
 * Draft-note blank so the averment is kept but completed by the filer.
 *
 * @param {Object} data - The divorce data
 * @param {Object} [opts]
 * @param {string} [opts.authority] - Statute requiring the statement, cited
 *   in the Draft note when known.
 * @returns {string}
 */
function pregnancyAverment(data = {}, opts = {}) {
  const status = pregnancyStatus(data);
  if (status === 'not_pregnant') {
    return 'Neither party is currently pregnant.';
  }
  if (status === 'pregnant') {
    return 'A party to this marriage is currently pregnant.\n(Draft — name the pregnant party and the expected date of birth; a child born during the marriage is generally presumed to be a child of the marriage, so parenting and support for that child may need to be addressed.)';
  }
  const why = opts.authority
    ? ` ${opts.authority} requires the petition to state this.`
    : ' A child expected during the marriage may need to be addressed in the parenting and support requests.';
  return draftBlank(
    'state whether either party is currently pregnant — for example, "Neither party is currently pregnant," or name the pregnant party and the expected date of birth.' +
    why
  );
}

const COUNSEL_VALUES = new Set(['attorney', 'lawyer', 'counsel', 'represented']);
const SELF_VALUES = new Set(['self', 'self-represented', 'self_represented', 'pro_se', 'pro se', 'pro-se', 'in pro per', 'unrepresented']);

/**
 * How a party appeared, for a decree's appearances recital. A missing
 * representation field is NOT evidence of self-representation: the recital
 * renders the counsel / self-represented phrase only from a recorded
 * answer, otherwise a fill-in blank with a Draft note (Ontario round-7
 * attorney review, generalized to every decree).
 *
 * @param {*} value - divorceData.petitionerRepresentation (or respondent…)
 * @param {string} counselPhrase - Jurisdiction wording when represented
 * @param {string} selfPhrase - Jurisdiction wording when self-represented
 * @returns {string}
 */
function representationPhrase(value, counselPhrase, selfPhrase) {
  const v = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (COUNSEL_VALUES.has(v)) return counselPhrase;
  if (SELF_VALUES.has(v)) return selfPhrase;
  const bare = (phrase) => phrase.replace(/^appear(?:ed|ing) /, '');
  return inlineDraftBlank(`confirm representation before filing: appeared ${bare(counselPhrase)}, appeared ${bare(selfPhrase)}, or did not appear`);
}

module.exports = {
  DRAFT_RULE,
  CASE_NUMBER_BLANK,
  draftBlank,
  inlineDraftBlank,
  primaryResidenceOrBlank,
  sanitizeCaseNumber,
  caseNumberOrBlank,
  pregnancyStatus,
  pregnancyAverment,
  representationPhrase,
};
