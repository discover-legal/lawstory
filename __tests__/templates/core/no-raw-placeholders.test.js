/** @jest-environment node */
'use strict';

/**
 * Templates say "this value is missing" ONLY through
 * templates/core/placeholders.js `placeholder()`, which emits a structured
 * marker. A raw bracket token in a string literal (e.g. '[COUNTY]',
 * '[location]', `[CASE NO.]`) would print verbatim — and the guards only act
 * on markers, never on free text — so this scan fails on any new one.
 *
 * Allowed literals: checkbox marks ("[X]", "[ ]"), printed signature-block
 * labels ("[Print, type, or stamp …]", "[Notary Seal]", "[Notary Name]",
 * "[Name and designation]"), and recitals the template deliberately leaves
 * for the court ("… TO BE COMPLETED BY THE COURT", "… to be completed by the
 * Court.", "… to be completed based on applicable law."). Regex sources
 * (character classes such as "[A-Z]") are not placeholders.
 */

const fs = require('fs');
const path = require('path');
const espree = require('espree');

const ROOT = path.join(__dirname, '../../..');
const DIRS = ['templates', 'services/supportDocs', 'services/documents', 'services/courtPacket'];
const BRACKET = /\[([A-Za-z][^\[\]\n]{0,140})\]/g;

function allowedLiteral(inner) {
  return (
    inner === 'X' ||
    /TO BE COMPLETED BY THE COURT/.test(inner) ||
    /to be completed (by the Court|based on applicable law)\.$/.test(inner) ||
    /^Print, [Tt]ype, or [Ss]tamp/.test(inner) ||
    /^Notary (Seal|Name)$/.test(inner) ||
    inner === 'Name and designation' ||
    // Regex character classes ("[A-Z]", "[A-Za-zÀ-…]") in RegExp sources.
    /^[A-Za-z0-9]-[A-Za-z0-9]/.test(inner)
  );
}

function jsFiles(dir) {
  let out = [];
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) out = out.concat(jsFiles(p));
    else if (p.endsWith('.js') && !p.endsWith(path.join('core', 'placeholders.js'))) out.push(p);
  }
  return out;
}

function tokens(src) {
  try {
    return espree.tokenize(src, { ecmaVersion: 'latest', sourceType: 'script' });
  } catch {
    return espree.tokenize(src, { ecmaVersion: 'latest', sourceType: 'module' });
  }
}

test('no raw bracket placeholder in any template / support-doc string literal', () => {
  const offenders = [];
  for (const dir of DIRS) {
    for (const file of jsFiles(path.join(ROOT, dir))) {
      for (const t of tokens(fs.readFileSync(file, 'utf8'))) {
        if (t.type !== 'String' && t.type !== 'Template') continue;
        for (const m of t.value.matchAll(BRACKET)) {
          if (!allowedLiteral(m[1])) offenders.push(`${path.relative(ROOT, file)}: ${m[0]}`);
        }
        // A bracket opened before a `${…}` substitution ("[CHILD ${i} NAME]").
        if (t.type === 'Template' && /\[[A-Z][A-Za-z ]*\$\{$/.test(t.value)) {
          offenders.push(`${path.relative(ROOT, file)}: ${t.value}`);
        }
      }
    }
  }
  expect(offenders).toEqual([]);
});
