'use strict';

/**
 * Which optional interview answers a jurisdiction's drafts actually use.
 *
 * The interview asks a question only where a document needs the answer
 * ("ask only where the jurisdiction/document needs it"). Rather than a
 * hand-kept list per question, the need is MEASURED: render the
 * jurisdiction's petition/decree with and without the answer and see
 * whether the draft changes. A template that adds or drops the
 * pregnancy averment, the matrimonial-home claim, or the representation
 * recital is therefore picked up automatically.
 *
 *   interviewNeeds('UT') → { pregnancy: true, matrimonialHome: false, representation: true }
 */

const fs = require('fs');
const path = require('path');
const Module = require('node:module');

// Same loading discipline as templates/core/TemplateLoader.js: the state
// directories are discovered at runtime, so they are required through
// createRequire from a cwd-rooted path the bundler is told to ignore
// (Next/Turbopack cannot statically resolve a dynamic template path).
const nodeRequire = Module.createRequire(__filename);
const STATES_DIR = path.resolve(path.join(/* turbopackIgnore: true */ process.cwd(), 'templates', 'states'));

let dirByCode = null;
function templateDirFor(stateCode) {
  if (!dirByCode) {
    dirByCode = new Map();
    for (const dir of fs.readdirSync(STATES_DIR)) {
      for (const file of ['divorce-metadata.json', 'metadata.json']) {
        const p = path.join(/* turbopackIgnore: true */ STATES_DIR, dir, file);
        if (!fs.existsSync(p)) continue;
        try {
          const code = JSON.parse(fs.readFileSync(p, 'utf8')).stateCode;
          if (code && !dirByCode.has(String(code).toUpperCase())) dirByCode.set(String(code).toUpperCase(), dir);
        } catch {
          // An unreadable metadata file simply contributes no mapping.
        }
      }
    }
  }
  return dirByCode.get(String(stateCode || '').toUpperCase()) || null;
}

const PROBE = {
  petitionerName: 'Probe Petitioner',
  respondentName: 'Probe Respondent',
  county: 'Probe',
  marriageDate: '2015-01-01',
  separationDate: '2020-01-01',
  hasProperty: true,
};
const PROBE_VARIANTS = [
  { ...PROBE, hasMinorChildren: true, children: [{ name: 'Probe Child', birthDate: '2016-01-01' }] },
  { ...PROBE, hasMinorChildren: false, children: [] },
];

function render(dir, kind, data) {
  const file = path.resolve(/* turbopackIgnore: true */ STATES_DIR, dir, `${kind}.js`);
  if (path.relative(STATES_DIR, file).startsWith('..') || !fs.existsSync(file)) return '';
  try {
    const Template = nodeRequire(/* turbopackIgnore: true */ file);
    const doc = new Template().generateDocument({ ...data });
    return String(doc.fullText || '');
  } catch {
    return '';
  }
}

/** Does `field = value` change the rendered document for any probe variant? */
function changes(dir, kind, field, value) {
  return PROBE_VARIANTS.some((v) => render(dir, kind, v) !== render(dir, kind, { ...v, [field]: value }));
}

const cache = new Map();

/**
 * @param {string} stateCode - e.g. 'UT', 'ON'
 * @returns {{pregnancy: boolean, matrimonialHome: boolean, representation: boolean}}
 */
function interviewNeeds(stateCode) {
  const key = String(stateCode || '').toUpperCase();
  if (cache.has(key)) return cache.get(key);
  const dir = templateDirFor(key);
  const needs = dir
    ? {
        pregnancy: changes(dir, 'DivorcePetitionTemplate', 'eitherPartyPregnant', false),
        matrimonialHome: changes(dir, 'DivorcePetitionTemplate', 'matrimonialHomePossessionRequested', true),
        representation: changes(dir, 'DivorceDecreeTemplate', 'petitionerRepresentation', 'self'),
      }
    : { pregnancy: false, matrimonialHome: false, representation: false };
  cache.set(key, needs);
  return needs;
}

module.exports = { interviewNeeds, templateDirFor };
