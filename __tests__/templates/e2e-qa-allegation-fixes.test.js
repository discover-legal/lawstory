/** @jest-environment node */
'use strict';

/**
 * Regressions from the E2E QA pass (2026-10): Utah/Tennessee/Missouri
 * pregnancy averment, Utah property allegation, Ontario property/debt/
 * matrimonial-home claims, Utah decree "[CASE NUMBER]" + "appeared pro se",
 * Ontario/Alberta "[PRIMARY RESIDENCE …]" printed into the decree, Ontario
 * preview "[COURT FILE NUMBER]", and the orphaned Utah jurat.
 */

const UtahPetition = require('../../templates/states/utah/DivorcePetitionTemplate');
const UtahDecree = require('../../templates/states/utah/DivorceDecreeTemplate');
const TennesseePetition = require('../../templates/states/tennessee/DivorcePetitionTemplate');
const MissouriPetition = require('../../templates/states/missouri/DivorcePetitionTemplate');
const OntarioPetition = require('../../templates/states/ontario/DivorcePetitionTemplate');
const OntarioDecree = require('../../templates/states/ontario/DivorceDecreeTemplate');
const AlbertaDecree = require('../../templates/states/alberta/DivorceDecreeTemplate');
const BaseDecree = require('../../templates/core/BaseDivorceDecreeTemplate');
const PDFService = require('../../services/pdfService');
const { findUnfilledPlaceholders } = require('../../templates/core/placeholders');

const base = {
  petitionerName: 'Mari Lopez',
  respondentName: 'Devin Lopez',
  county: 'Salt Lake',
  marriageDate: '2014-05-10',
  separationDate: '2024-02-01',
  groundsForDivorce: 'irreconcilable_differences',
};
const kids = { ...base, hasMinorChildren: true, children: [{ name: 'Emma Lopez', birthDate: '2017-09-01' }] };

const sectionText = (section) => (section.items || []).map((i) => i.content).join('\n');

describe('Utah petition', () => {
  test('silent property → Draft-note blank, not "acquired certain real and personal property"', () => {
    const doc = new UtahPetition().generateDocument(kids);
    const text = sectionText(doc.sections.propertyInfo);
    expect(text).not.toMatch(/acquired certain real and personal property/);
    expect(text).not.toMatch(/acquired marital property/);
    expect(text).toMatch(/Draft — confirm whether you and your spouse have any marital\/community property/);
    // The division request survives in the prayer, so no claim is waived.
    expect(doc.fullText).toMatch(/Make an equitable division of the marital property and debts/);
  });

  test('hasProperty:true pleads the property allegation (without assuming real estate)', () => {
    const text = sectionText(new UtahPetition().generateDocument({ ...kids, hasProperty: true }).sections.propertyInfo);
    expect(text).toMatch(/During the marriage, the parties have acquired marital property\./);
    expect(text).toMatch(/equitable division of the marital property and debts/);
  });

  test('never swears "the wife is not now pregnant" from silence', () => {
    for (const data of [kids, { ...base, hasMinorChildren: false, children: [] }]) {
      const doc = new UtahPetition().generateDocument(data);
      expect(doc.fullText).not.toMatch(/wife is not now pregnant|no minor children are expected/);
      expect(doc.fullText).toMatch(/Draft — state whether either party is currently pregnant/);
    }
    expect(new UtahPetition().generateDocument({ ...kids, eitherPartyPregnant: false }).fullText)
      .toContain('Neither party is currently pregnant.');
  });

  test('the child is listed inside the "following minor children" paragraph, not as its own paragraph', () => {
    const items = new UtahPetition().generateDocument(kids).sections.childrenInfo.items;
    const intro = items.find((i) => /following minor children/.test(i.content));
    const child = items.find((i) => i.type === 'child_detail');
    expect(intro.number).toEqual(expect.any(Number));
    expect(child.number).toBeNull();
    const next = items[items.indexOf(child) + 1];
    expect(next.number).toBe(intro.number + 1);
  });
});

describe.each([
  ['Tennessee', TennesseePetition, null],
  ['Missouri', MissouriPetition, /RSMo § 452\.310\.2\(5\) requires the petition to state this/],
])('%s petition pregnancy averment', (_name, Template, cite) => {
  test('kept as a gender-neutral blank when unknown', () => {
    const text = new Template().generateDocument({ ...base, hasMinorChildren: false, children: [] }).fullText;
    expect(text).not.toMatch(/wife is not now pregnant/);
    expect(text).toMatch(/Draft — state whether either party is currently pregnant/);
    if (cite) expect(text).toMatch(cite);
  });
});

describe('Ontario Application', () => {
  const onData = { ...kids, county: 'Toronto', groundsForDivorce: 'separation' };

  test('silence: no property/debt allegation, no matrimonial-home claim', () => {
    const doc = new OntarioPetition().generateDocument(onData);
    expect(doc.fullText).not.toMatch(/real property, personal property, and financial accounts/);
    expect(doc.fullText).not.toMatch(/parties have accumulated debts/);
    expect(doc.fullText).not.toMatch(/matrimonial home/);
    expect(sectionText(doc.sections.propertyInfo)).toMatch(/Draft — confirm whether you and your spouse have net family property to equalize/);
    // Equalization and debt-allocation claims stay in the relief section.
    expect(doc.fullText).toMatch(/Division of net family property/);
  });

  test('affirmative answers still plead property, debts, and the home claim', () => {
    const doc = new OntarioPetition().generateDocument({
      ...onData, hasProperty: true, hasDebts: true, matrimonialHomePossessionRequested: true,
    });
    expect(doc.fullText).toMatch(/The parties acquired property during the marriage\./);
    expect(doc.fullText).toMatch(/The parties have accumulated debts during the marriage/);
    expect(doc.fullText).toMatch(/possession of the matrimonial home pursuant to section 24/);
  });

  test('Court File No. is the same blank in the preview sections and the PDF', () => {
    const doc = new OntarioPetition().generateDocument(onData);
    expect(doc.sections.caseCaption.formatted).toMatch(/Court File No\. _{10,}/);
    expect(JSON.stringify(doc.sections)).not.toMatch(/\[COURT FILE NUMBER\]/);
  });
});

describe('Utah decree', () => {
  test('no "[CASE NUMBER]" token — the generate guard no longer 422s a pre-filing decree', () => {
    const doc = new UtahDecree().generateDocument(kids);
    expect(doc.fullText).toMatch(/Case No\. _{10,}/);
    expect(findUnfilledPlaceholders(doc.sections)).toEqual([]);
  });

  test('does not recite "appeared pro se" unless representation is recorded', () => {
    const silent = new UtahDecree().generateDocument(kids).fullText;
    expect(silent).not.toMatch(/Mari Lopez appeared pro se/);
    expect(silent).toMatch(/Mari Lopez _+ \(Draft — insert 'appeared by and through counsel', 'appeared pro se', or 'did not appear'\)/);
    expect(silent).not.toMatch(/appeared _+/);
    expect(new UtahDecree().generateDocument({ ...kids, petitionerRepresentation: 'self' }).fullText)
      .toMatch(/Mari Lopez appeared pro se/);
  });

  test('joint custody without a recorded residence never awards primary physical custody to the petitioner', () => {
    const text = new UtahDecree().generateDocument({ ...kids, custodyArrangement: 'joint' }).fullText;
    expect(text).not.toMatch(/Mari Lopez is awarded primary physical custody/);
    expect(text).toMatch(/_+ \(Draft — name the parent with whom the child\(ren\) will primarily reside\) is awarded primary physical custody/);
  });
});

describe.each([
  ['Ontario', OntarioDecree, 'Toronto'],
  ['Alberta', AlbertaDecree, 'Calgary'],
])('%s decree, joint custody without a primary residence', (_n, Template, county) => {
  test('renders a Draft-note blank, never a "[PRIMARY RESIDENCE …]" token', () => {
    const doc = new Template().generateDocument({ ...kids, county, custodyArrangement: 'joint' });
    expect(doc.fullText).not.toMatch(/\[PRIMARY RESIDENCE/);
    expect(doc.fullText).toMatch(/_+ \(Draft — name the parent with whom the child\(ren\) primarily reside\)/);
    expect(findUnfilledPlaceholders(doc.sections)).toEqual([]);
  });
});

describe('base decree appearances', () => {
  test('a missing representation field is not recited as self-representation', () => {
    const text = new BaseDecree().generateAppearancesSection(kids).text;
    expect(text).not.toMatch(/Mari Lopez, appeared pro se/i);
    expect(text).toMatch(/Mari Lopez, _+ \(Draft — insert 'appeared by and through counsel'/);
  });
});

describe('pdfService jurat keep-together', () => {
  test('the Utah verification splits into sworn body + signature/jurat block', () => {
    const text = new UtahPetition().getVerificationText({ petitionerName: 'Mari Lopez', county: 'Salt Lake' });
    const { body, jurat } = PDFService.splitJurat(text);
    expect(body).toMatch(/being first duly sworn/);
    expect(body).not.toMatch(/Notary Public/);
    expect(jurat).toMatch(/^_+\nMari Lopez, Petitioner/);
    expect(jurat).toMatch(/SUBSCRIBED AND SWORN[\s\S]*Notary Public[\s\S]*My Commission Expires/);
  });

  test('text without a jurat is left whole', () => {
    expect(PDFService.splitJurat('I swear this is true.')).toEqual({ body: 'I swear this is true.', jurat: '' });
  });
});

describe.each([
  ['illinois', /Financial Affidavit is being filed/],
  ['massachusetts', /Financial Statement is being filed herewith/],
  ['new_jersey', /Case Information Statement \(CIS\) is being filed/],
])('%s petition keeps its procedural financial-disclosure recital', (dir, re) => {
  test.each([[{}], [{ hasProperty: true }], [{ hasProperty: false, noPropertyConfirmed: true }]])('posture %p', (extra) => {
    const T = require(`../../templates/states/${dir}/DivorcePetitionTemplate`);
    const doc = new T().generateDocument({ ...base, county: 'Cook', ...extra });
    expect(sectionText(doc.sections.propertyInfo)).toMatch(re);
  });
});
