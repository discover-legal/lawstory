/** @jest-environment node */
'use strict';

/**
 * Owner decisions (2026-10), swept across every jurisdiction:
 *  - a proposed decree finds/awards property and allocates debts ONLY from
 *    known facts (itemized lists, an agreement, a confirmed "none"); silence
 *    or a bare yes/no renders a Draft-note blank for the proposed order;
 *  - custody stored as a bare legacy "sole" with no named custodian never
 *    becomes a sole order to the petitioner;
 *  - claim-preserving property paragraphs (NC equitable distribution, LA/NV
 *    separate property) survive when property is unknown;
 *  - the editor preview carries no [TOKEN] (same blanks as the PDF);
 *  - interview questions are asked only where a jurisdiction's drafts use
 *    the answer (templates/core/interviewNeeds.js).
 */

const fs = require('fs');
const path = require('path');
const { interviewNeeds } = require('../../templates/core/interviewNeeds');
const { blankPlaceholdersDeep, findPlaceholders } = require('../../templates/core/placeholders');

const STATES_DIR = path.join(__dirname, '../../templates/states');
const DIRS = fs.readdirSync(STATES_DIR).sort();
const base = {
  petitionerName: 'Pat Doe',
  respondentName: 'Sam Doe',
  county: 'Salt Lake',
  marriageDate: '2015-06-01',
  separationDate: '2024-01-01',
  hasMinorChildren: true,
  children: [{ name: 'Emma Doe', birthDate: '2018-03-04' }],
};
const decree = (dir, extra = {}) => {
  const T = require(path.join(STATES_DIR, dir, 'DivorceDecreeTemplate.js'));
  return new T().generateDocument({ ...base, state: dir, ...extra });
};
const itemsText = (section) => (section ? [section.text || '', ...(section.items || []).map((i) => i.content)].join('\n') : '');

describe.each(DIRS)('%s decree — property/debt orders from known facts only', (dir) => {
  test.each([
    ['silence', {}],
    ['bare hasProperty/hasDebts true', { hasProperty: true, hasDebts: true }],
    ['bare unconfirmed false', { hasProperty: false, hasDebts: false }],
  ])('%s → Draft-note blanks, no award/allocation', (_label, extra) => {
    const doc = decree(dir, extra);
    expect(doc.sections.propertyDivision.items.map((i) => i.type)).toEqual(['property_draft_note']);
    expect(doc.sections.debtAllocation.items.map((i) => i.type)).toEqual(['debts_draft_note']);
    expect(itemsText(doc.sections.propertyDivision)).toMatch(/Draft —/);
  });

  test('itemized property and debts still render the jurisdiction\'s orders', () => {
    const doc = decree(dir, {
      hasProperty: true,
      hasDebts: true,
      petitionerProperty: ['2018 Honda Civic'],
      respondentDebts: ['Visa card'],
    });
    // The jurisdiction's order renders (a side with no list may still get
    // its own fill-in line, never a default award).
    expect(doc.sections.propertyDivision.items.some((i) => i.type !== 'property_draft_note')).toBe(true);
    expect(doc.sections.debtAllocation.items.some((i) => i.type !== 'debts_draft_note')).toBe(true);
  });

  test('no custody arrangement on the record → no joint/sole custody order', () => {
    const text = decree(dir).fullText;
    expect(text).not.toMatch(/awarded joint (legal )?custody|shall have joint custody|joint managing conservators/i);
  });

  test('legacy custody "sole" with no named custodian is never a sole order to the petitioner', () => {
    const text = decree(dir, { custodyType: 'sole' }).fullText;
    expect(text).not.toMatch(/Pat Doe (is awarded|shall have) sole/);
    expect(text).not.toMatch(/that Pat Doe shall have sole/);
  });
});

describe('claim-preserving property paragraphs survive silence', () => {
  test.each([
    ['north_carolina', /expressly asserts this claim before entry of the divorce judgment/],
    ['louisiana', /confirmed as the owner of their separate property/],
    ['nevada', /awarded their respective separate property/],
  ])('%s', (dir, re) => {
    const T = require(path.join(STATES_DIR, dir, 'DivorcePetitionTemplate.js'));
    const items = new T().generateDocument({ ...base, state: dir }).sections.propertyInfo.items;
    expect(items.map((i) => i.type)).toEqual(['property_draft_note', 'property_claim']);
    expect(items[1].content).toMatch(re);
  });
});

describe('Alberta matrimonial-home claim', () => {
  test('claimed only on request', () => {
    const T = require(path.join(STATES_DIR, 'alberta', 'DivorcePetitionTemplate.js'));
    const data = { ...base, county: 'Calgary', groundsForDivorce: 'separation' };
    expect(new T().generateDocument(data).fullText).not.toMatch(/exclusive possession of the family home/);
    expect(new T().generateDocument({ ...data, matrimonialHomePossessionRequested: true }).fullText)
      .toMatch(/exclusive possession of the family home/);
  });
});

describe('editor preview has no bracket tokens', () => {
  test('Ontario petition with no names: preview sections are blanks, not [APPLICANT NAME]/[PETITIONER NAME]', () => {
    const T = require(path.join(STATES_DIR, 'ontario', 'DivorcePetitionTemplate.js'));
    const raw = new T().generateDocument({ county: 'Toronto' }).sections;
    expect(findPlaceholders(JSON.stringify(raw)).length).toBeGreaterThan(0); // the guard still sees them
    expect(findPlaceholders(JSON.stringify(blankPlaceholdersDeep(raw)))).toEqual([]);
  });
});

describe('Ontario Application form', () => {
  test('metadata states the Form 8 / Form 8A rule', () => {
    const meta = JSON.parse(fs.readFileSync(path.join(STATES_DIR, 'ontario', 'divorce-metadata.json'), 'utf8'));
    const names = meta.requiredForms.basic.map((f) => f.name);
    expect(names).toEqual(expect.arrayContaining(['Form 8 — Application (General)', 'Form 8A — Application (Divorce)']));
    const f8a = meta.requiredForms.basic.find((f) => f.name.startsWith('Form 8A'));
    expect(f8a.required).toBe(false);
    expect(f8a.description).toMatch(/divorce only → Form 8A; divorce plus any corollary claim → Form 8/);
  });
});

describe('interviewNeeds', () => {
  test('matrimonial-home question only for the jurisdictions whose drafts claim it', () => {
    const codes = DIRS.map((d) => JSON.parse(fs.readFileSync(path.join(STATES_DIR, d, 'metadata.json'), 'utf8')).stateCode);
    expect(codes.filter((c) => interviewNeeds(c).matrimonialHome).sort()).toEqual(['AB', 'ON']);
  });
  test('pregnancy + representation measured from the drafts', () => {
    expect(interviewNeeds('MO')).toMatchObject({ pregnancy: true, representation: true, matrimonialHome: false });
    expect(interviewNeeds('ZZ')).toEqual({ pregnancy: false, matrimonialHome: false, representation: false });
  });
});
