/** @jest-environment node */
'use strict';

/**
 * Shared "unknown is a visible blank" helpers (templates/core/blanks.js)
 * and the generic placeholder grammar (templates/core/placeholders.js) that
 * both the generate-route guard and pdfService.sanitizeForFiling use.
 */

const {
  caseNumberOrBlank,
  pregnancyAverment,
  representationPhrase,
  primaryResidenceOrBlank,
} = require('../../../templates/core/blanks');
const {
  findPlaceholders,
  findUnfilledPlaceholders,
  blankPlaceholders,
} = require('../../../templates/core/placeholders');

describe('caseNumberOrBlank', () => {
  test.each([undefined, null, '', '   ', 'null', 'N/A', '.', '..'])('%p → fill-in blank', (v) => {
    expect(caseNumberOrBlank(v)).toBe('____________________');
  });
  test('a real number passes through trimmed', () => {
    expect(caseNumberOrBlank(' 254900123 ')).toBe('254900123');
  });
});

describe('pregnancyAverment', () => {
  test('silence → gender-neutral Draft-note blank, never an allegation', () => {
    const text = pregnancyAverment({});
    expect(text).toMatch(/^_{10,}\n\(Draft — state whether either party is currently pregnant/);
    expect(text).not.toMatch(/\bwife\b/i);
    expect(text).not.toMatch(/is not (now )?pregnant/i);
  });
  test('a statute requiring the averment is cited in the Draft note', () => {
    expect(pregnancyAverment({}, { authority: 'RSMo § 452.310.2(5)' })).toMatch(/RSMo § 452\.310\.2\(5\) requires the petition to state this/);
  });
  test('affirmative "no" renders the sworn statement', () => {
    expect(pregnancyAverment({ eitherPartyPregnant: false })).toBe('Neither party is currently pregnant.');
    expect(pregnancyAverment({ wifePregnant: false })).toBe('Neither party is currently pregnant.');
  });
  test('affirmative "yes" says so and asks for the details', () => {
    expect(pregnancyAverment({ eitherPartyPregnant: true })).toMatch(/^A party to this marriage is currently pregnant\.\n\(Draft — name the pregnant party/);
  });
});

describe('representationPhrase', () => {
  test('missing representation is NOT self-representation', () => {
    const out = representationPhrase(undefined, 'with counsel', 'pro se');
    expect(out).not.toBe('pro se');
    expect(out).toMatch(/Draft — confirm representation before filing: appeared with counsel, appeared pro se, or did not appear/);
  });
  test.each([['attorney', 'with counsel'], ['lawyer', 'with counsel'], ['self', 'pro se'], ['pro_se', 'pro se']])('%p → %p', (v, want) => {
    expect(representationPhrase(v, 'with counsel', 'pro se')).toBe(want);
  });
});

describe('primaryResidenceOrBlank', () => {
  test('never defaults to a party', () => {
    expect(primaryResidenceOrBlank(null)).toMatch(/^_+ \(Draft — name the parent with whom the child\(ren\) will primarily reside\)$/);
    expect(primaryResidenceOrBlank('Priya Thompson')).toBe('Priya Thompson');
  });
});

describe('generic placeholder grammar', () => {
  test('catches any bracketed ALL-CAPS token, with or without an instruction tail', () => {
    const heads = findPlaceholders(
      'Case No. [CASE NUMBER]; [COURT REF. NUMBER]; [NUMBER]/[YEAR]; ' +
      'with this Court: [PRIMARY RESIDENCE — set out the parent with whom the child(ren) primarily reside].'
    ).map((p) => p.head);
    expect(heads).toEqual(['CASE NUMBER', 'COURT REF. NUMBER', 'NUMBER', 'YEAR', 'PRIMARY RESIDENCE']);
  });

  test('legitimate bracketed text is not a placeholder', () => {
    const legit = [
      'Physical custody is awarded to: [X] Petitioner', // checkbox mark
      '[Print, type, or stamp commissioned name of notary or deputy clerk.]',
      'Judge [Smith]',
      'section 12(b)[3]',
      '[ ] SNAP (food stamps)',
      'Signed on [DATE]. [NOTARY SEAL] [SEAL] [JUDGE SIGNATURE] EXHIBIT [LABEL]',
      'Respondent: [APPEARANCE, SERVICE, AND DEFAULT STATUS — TO BE COMPLETED BY THE COURT].',
    ];
    for (const text of legit) expect(findPlaceholders(text)).toEqual([]);
  });

  test('findUnfilledPlaceholders scans a whole structure and labels the gaps', () => {
    const labels = findUnfilledPlaceholders({
      sections: { caption: { petitioner: '[PETITIONER NAME]' }, body: [{ text: 'born [BIRTH DATE]' }, { text: '[SOMETHING NEW — fill me in]' }] },
    });
    expect(labels).toEqual(['child birth date', 'petitioner name', 'something new']);
  });

  test('blankPlaceholders keeps an instruction as a Draft note', () => {
    expect(blankPlaceholders('with this Court: [PRIMARY RESIDENCE — set out the parent].'))
      .toBe('with this Court: ______________ (Draft — set out the parent).');
    expect(blankPlaceholders('Case No. [CASE NUMBER]')).toBe('Case No. ______________');
    expect(blankPlaceholders('[X] Petitioner')).toBe('[X] Petitioner');
  });
});
