/** @jest-environment node */
// The filed-output guarantee: no template placeholder marker survives into a
// generated PDF/DOCX, and nothing the USER wrote is ever rewritten.
// pdfService.sanitizeForFiling is the choke point (templates/core/placeholders.js).

const PDFService = require('../../services/pdfService');
const { placeholder } = require('../../templates/core/placeholders');

describe('sanitizeForFiling', () => {
  const svc = new PDFService({ templateManager: null });

  it('replaces placeholder markers with fill-in blanks, deeply', () => {
    const out = svc.sanitizeForFiling({
      caption: `CASE NO. ${placeholder('CASE NUMBER')}`,
      nested: { court: `IN THE ${placeholder('COURT NAME')}`, keep: 42 },
      list: [placeholder('BIRTH DATE'), `born ${placeholder('BIRTH DATE')}`, null],
    });
    expect(out.caption).toBe('CASE NO. ______________');
    expect(out.nested.court).toBe('IN THE ______________');
    expect(out.nested.keep).toBe(42);
    expect(out.list[0]).toBe('______________');
    expect(out.list[1]).toBe('born ______________');
    expect(out.list[2]).toBeNull();
  });

  it('keeps an instruction as a Draft note', () => {
    expect(svc.sanitizeForFiling(`with this Court: ${placeholder('PRIMARY RESIDENCE', 'set out the parent with whom the child(ren) primarily reside')}.`))
      .toBe('with this Court: __________________________ (Draft — set out the parent with whom the child(ren) primarily reside).');
  });

  it('never rewrites user text, however bracketed', () => {
    const untouched = [
      '(SEAL)',
      'Judge [Smith]',
      'section 12(b)[3]',
      'IT IS ORDERED, ADJUDGED, AND DECREED.',
      'The account number is [REDACTED].',
      'He yelled [EXPLETIVE] at me; we lived in [ON]; see [II], [A-1] and Smith v. Jones [ONCA].',
      '[CASE NUMBER] typed by the user',
      'awarded to: [X] Petitioner',
      'Respondent: [APPEARANCE OR SIGNED STIPULATION — TO BE COMPLETED BY THE COURT].',
    ];
    for (const text of untouched) {
      expect(svc.sanitizeForFiling(text)).toBe(text);
    }
  });
});
