/** @jest-environment node */
'use strict';

/**
 * v5.1.0 safety rule, swept across EVERY jurisdiction: silence in the
 * transcript must never become an allegation. A petition built from a
 * profile that never mentioned property, debts, or pregnancy must not
 * plead that a marital estate exists, that debts were incurred, or that
 * "the wife is not now pregnant" — each renders a visible Draft-note blank
 * (or nothing) instead. Live E2E QA found all three in the Utah petition
 * and the property/debt/matrimonial-home claims in the Ontario Application.
 */

const fs = require('fs');
const path = require('path');
const { findUnfilledPlaceholders } = require('../../templates/core/placeholders');

const STATES_DIR = path.join(__dirname, '../../templates/states');
const JURISDICTIONS = fs.readdirSync(STATES_DIR)
  .filter((d) => fs.existsSync(path.join(STATES_DIR, d, 'DivorcePetitionTemplate.js')))
  .sort();

const SPARSE = {
  petitionerName: 'Pat Doe',
  respondentName: 'Sam Doe',
  county: 'Salt Lake',
  marriageDate: '2015-06-01',
  separationDate: '2024-01-01',
  groundsForDivorce: 'irreconcilable_differences',
};
const WITH_CHILD = { ...SPARSE, hasMinorChildren: true, children: [{ name: 'Emma Doe', birthDate: '2018-03-04' }] };
const NO_CHILD = { ...SPARSE, hasMinorChildren: false, children: [] };

const PROPERTY_ALLEGATION = /\b(have|has) (accumulated|acquired)\b[^.]*\b(property|assets|estate)\b|There exists community property|parties acquired (marital )?property/i;
const DEBT_ALLEGATION = /\b(accumulated|incurred) (marital |family |community )?debts?\b(?! (in an|equitabl))|property and (community )?debts during/i;
const PREGNANCY_ASSERTION = /\bwife\b[^.]*\bpregnant\b|not (now )?pregnant|none (are|is) expected|children are expected|child is expected/i;

function petition(dir, data) {
  const T = require(path.join(STATES_DIR, dir, 'DivorcePetitionTemplate.js'));
  return new T().generateDocument({ ...data, state: dir });
}

describe.each(JURISDICTIONS)('%s petition — silence', (dir) => {
  test('no property, debt, or pregnancy allegation; property renders a Draft-note blank', () => {
    for (const data of [WITH_CHILD, NO_CHILD]) {
      const doc = petition(dir, data);
      const property = doc.sections.propertyInfo.items.map((i) => i.content).join('\n');
      expect(property).not.toMatch(PROPERTY_ALLEGATION);
      expect(property).not.toMatch(DEBT_ALLEGATION);
      expect(doc.sections.propertyInfo.items.some((i) => i.type === 'property_draft_note')).toBe(true);
      expect(doc.fullText).not.toMatch(PREGNANCY_ASSERTION);
      expect(doc.fullText).not.toMatch(/matrimonial home/i);
    }
  });

  test('children are listed inside one paragraph, and numbering stays sequential', () => {
    const doc = petition(dir, WITH_CHILD);
    const items = doc.sections.childrenInfo.items;
    for (const item of items.filter((i) => i.type === 'child_detail')) {
      expect(item.number).toBeNull();
    }
    const numbers = ['parties', 'jurisdiction', 'marriageInfo', 'grounds', 'childrenInfo', 'propertyInfo']
      .flatMap((k) => (doc.sections[k] ? doc.sections[k].items : []))
      .map((i) => i.number)
      .filter((n) => typeof n === 'number');
    for (let i = 1; i < numbers.length; i += 1) {
      expect(numbers[i]).toBeGreaterThan(numbers[i - 1]);
    }
  });

  test('no bracketed placeholder token for optional data (case number etc.)', () => {
    // Scotland's caption needs a recognised sheriffdom for the county — a
    // required location, reported like a missing county.
    if (dir === 'scotland') return;
    expect(findUnfilledPlaceholders(petition(dir, WITH_CHILD).sections)).toEqual([]);
  });
});

describe.each(JURISDICTIONS)('%s petition — affirmative answers still plead', (dir) => {
  test('hasProperty:true + hasDebts:true pleads the property AND debt allegations (no Draft note)', () => {
    const doc = petition(dir, { ...WITH_CHILD, hasProperty: true, hasDebts: true });
    const property = doc.sections.propertyInfo.items.map((i) => i.content).join('\n');
    expect(doc.sections.propertyInfo.items.some((i) => i.type === 'property_draft_note')).toBe(false);
    expect(property).toMatch(PROPERTY_ALLEGATION);
    // Debts appear as an allegation or (where the jurisdiction pleads them
    // only as relief) in the prayer.
    const relief = (doc.sections.reliefRequested?.items || []).map((i) => i.content).join('\n');
    expect(`${property}\n${relief}`).toMatch(/\bdebts?\b|liabilities|estate/i);
  });

  test('eitherPartyPregnant:false is pleaded wherever a pregnancy averment is carried', () => {
    const blank = petition(dir, WITH_CHILD);
    const carried = /Draft — state whether either party is currently pregnant/.test(blank.fullText);
    const doc = petition(dir, { ...WITH_CHILD, eitherPartyPregnant: false });
    if (carried) {
      expect(doc.fullText).toContain('Neither party is currently pregnant.');
      expect(doc.fullText).not.toMatch(/Draft — state whether either party is currently pregnant/);
    }
  });
});
