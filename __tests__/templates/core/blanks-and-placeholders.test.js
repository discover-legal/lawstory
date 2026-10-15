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
  placeholder,
  findPlaceholders,
  findUnfilledPlaceholders,
  blankPlaceholders,
  blankPlaceholdersDeep,
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
    const out = representationPhrase(undefined, 'appeared with counsel', 'appeared pro se');
    expect(out).not.toBe('appeared pro se');
    // The verb lives inside each option, so "Petitioner ____" reads correctly once filled in.
    expect(out).toBe("__________________________ (Draft — insert 'appeared with counsel', 'appeared pro se', or 'did not appear')");
  });
  test.each([['attorney', 'appeared with counsel'], ['lawyer', 'appeared with counsel'], ['self', 'appeared pro se'], ['pro_se', 'appeared pro se']])('%p → %p', (v, want) => {
    expect(representationPhrase(v, 'appeared with counsel', 'appeared pro se')).toBe(want);
  });
});

describe('primaryResidenceOrBlank', () => {
  test('never defaults to a party', () => {
    expect(primaryResidenceOrBlank(null)).toMatch(/^_+ \(Draft — name the parent with whom the child\(ren\) will primarily reside\)$/);
    expect(primaryResidenceOrBlank('Priya Thompson')).toBe('Priya Thompson');
  });
});

describe('placeholder markers', () => {
  test('templates mark gaps with placeholder(); only markers are found', () => {
    const text = `Case No. ${placeholder('CASE NUMBER')} with this Court: ${placeholder('PRIMARY RESIDENCE', 'set out the parent')}.`;
    expect(findPlaceholders(text).map((p) => [p.head, p.instruction])).toEqual([
      ['CASE NUMBER', null],
      ['PRIMARY RESIDENCE', 'set out the parent'],
    ]);
  });

  test('user text that merely LOOKS like a token is never a placeholder', () => {
    const userText = [
      'He called me [EXPLETIVE] in front of the kids.',
      'The bank statement is [REDACTED] for privacy.',
      'We moved to [ON] in 2019; Smith v. Jones [ONCA] applies; see [II] and [A-1].',
      'Physical custody is awarded to: [X] Petitioner',
    ].join(' ');
    expect(findPlaceholders(userText)).toEqual([]);
    expect(findUnfilledPlaceholders({ facts: [{ content: userText }] })).toEqual([]);
    expect(blankPlaceholders(userText)).toBe(userText);
  });

  test('court-completed marks print as blanks but never block', () => {
    const text = `Signed on ${placeholder('DATE')}. ${placeholder('NOTARY SEAL')}`;
    expect(findPlaceholders(text)).toEqual([]);
    expect(blankPlaceholders(text)).toBe('Signed on ______________. ______________');
  });

  test('findUnfilledPlaceholders scans a whole structure and labels the gaps', () => {
    const labels = findUnfilledPlaceholders({
      sections: {
        caption: { petitioner: placeholder('PETITIONER NAME').toUpperCase() },
        body: [{ text: `born ${placeholder('BIRTH DATE')}` }, { text: placeholder('SOMETHING NEW', 'fill me in') }],
      },
    });
    expect(labels).toEqual(['child birth date', 'petitioner name', 'something new']);
  });

  test('blankPlaceholders keeps an instruction as a Draft note and leaves the rest of the string alone', () => {
    expect(blankPlaceholders(`with this Court: ${placeholder('PRIMARY RESIDENCE', 'set out the parent')}. [REDACTED]`))
      .toBe('with this Court: __________________________ (Draft — set out the parent). [REDACTED]');
    expect(blankPlaceholdersDeep({ a: [`Case No. ${placeholder('CASE NUMBER')}`], n: 3 })).toEqual({ a: ['Case No. ______________'], n: 3 });
  });
});
