#!/usr/bin/env node
/**
 * Derive the UI names of the two core divorce drafts — and the parties —
 * from the jurisdiction templates themselves, so the editor never promises
 * a "Petition" that the draft titles "APPLICATION FOR DIVORCE".
 *
 * Sources, per templates/states/<dir>/:
 *   metadata.json                 stateCode, stateName, countryCode
 *   DivorcePetitionTemplate.js    this.documentTitle  + party vocabulary
 *   DivorceDecreeTemplate.js      this.documentTitle
 *   divorce-metadata.json         terminology.caseNumberLabel (optional)
 *
 * Output: lib/divorceDocLabels.data.json (committed; client code imports it).
 * __tests__/lib/divorceDocLabels.test.ts re-derives and fails on drift, so a
 * template title change shows up as a one-command regeneration:
 *   node scripts/buildDivorceDocLabels.js
 */
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const STATES_DIR = path.join(ROOT, 'templates', 'states');
const OUT = path.join(ROOT, 'lib', 'divorceDocLabels.data.json');

const SMALL_WORDS = new Set(['of', 'for', 'in', 'and', 'the', 'a', 'an', 'to', 'on', 'by']);

function readTitle(file) {
  if (!fs.existsSync(file)) return null;
  const src = fs.readFileSync(file, 'utf8');
  // Syntactic extraction of a string literal assignment (the templates set
  // their title exactly once, as a literal).
  const m = /this\.documentTitle\s*=\s*(['"`])([\s\S]*?)\1/.exec(src);
  if (!m) return null;
  // Bilingual titles ("APPLICATION FOR DIVORCE\n(DEMANDE EN DIVORCE)"):
  // the first line is the English name.
  return m[2].replace(/\\n/g, '\n').split('\n')[0].trim() || null;
}

function titleCase(upper) {
  return upper
    .toLowerCase()
    .split(' ')
    .map((word, i) =>
      word
        .split('-')
        .map((part) => {
          if (i > 0 && SMALL_WORDS.has(part)) return part;
          return part.replace(/^(\(?)([a-z])/, (_, p, c) => p + c.toUpperCase());
        })
        .join('-'),
    )
    .join(' ');
}

/** "Petition for Dissolution of Marriage" → "Petition"; tab-sized names. */
function shortName(full) {
  const s = full
    .replace(/\s*\([^)]*\)\s*$/, '')
    .replace(/\s+(for|of|in|granting)\s+(absolute\s+)?(divorce|dissolution of marriage)\b.*$/i, '')
    .replace(/^(Verified|Original)\s+/, '')
    .trim();
  // "Findings of Fact, Conclusions of Law, and Order for Judgment": a tab
  // needs the operative part, the order.
  const shortest = s.length > 30 ? s.split(/,\s*(?:and\s+)?/).pop() : s;
  return shortest || full;
}

function countWords(src, words) {
  const counts = Object.fromEntries(words.map((w) => [w, 0]));
  for (const w of words) counts[w] = (src.match(new RegExp(`\\b${w}\\b`, 'g')) || []).length;
  return counts;
}

function majority(counts) {
  const [word, n] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  return n > 0 ? word : null;
}

function deriveParties(petitionFile, petitionTitle) {
  const src = fs.readFileSync(petitionFile, 'utf8');
  const filing =
    majority(countWords(src, ['Petitioner', 'Applicant', 'Plaintiff', 'Claimant'])) ||
    (/^COMPLAINT|STATEMENT OF CLAIM/.test(petitionTitle) ? 'Plaintiff'
      : /APPLICATION/.test(petitionTitle) ? 'Applicant'
      : /NOTICE OF FAMILY CLAIM/.test(petitionTitle) ? 'Claimant'
      : 'Petitioner');
  const responding =
    majority(countWords(src, ['Respondent', 'Defendant'])) ||
    (filing === 'Plaintiff' ? 'Defendant' : 'Respondent');
  return { filingParty: filing, respondingParty: responding };
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

function build() {
  const out = {};
  for (const dir of fs.readdirSync(STATES_DIR).sort()) {
    const base = path.join(STATES_DIR, dir);
    const meta = readJson(path.join(base, 'metadata.json'));
    if (!meta?.stateCode) continue;
    const petitionFile = path.join(base, 'DivorcePetitionTemplate.js');
    const petitionTitle = readTitle(petitionFile);
    const decreeTitle = readTitle(path.join(base, 'DivorceDecreeTemplate.js'));
    if (!petitionTitle || !decreeTitle) continue;
    const divorceMeta = readJson(path.join(base, 'divorce-metadata.json'));
    const petition = titleCase(petitionTitle);
    const decree = titleCase(decreeTitle);
    out[meta.stateCode] = {
      name: meta.stateName,
      country: meta.countryCode || null,
      petition,
      petitionShort: shortName(petition),
      decree,
      decreeShort: shortName(decree),
      ...deriveParties(petitionFile, petitionTitle),
      caseNumberLabel: divorceMeta?.terminology?.caseNumberLabel || null,
    };
  }
  return out;
}

module.exports = { build, titleCase, shortName };

if (require.main === module) {
  fs.writeFileSync(OUT, `${JSON.stringify(build(), null, 2)}\n`);
  console.log(`wrote ${path.relative(ROOT, OUT)}`);
}
