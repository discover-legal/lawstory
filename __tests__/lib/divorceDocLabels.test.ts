/** @jest-environment node */
import fs from 'node:fs';
import path from 'node:path';
import { divorceDocLabels, divorceSubDocLabel, labelSlug } from '@/lib/divorceDocLabels';
import { describeGenerateError } from '@/lib/downloadError';

describe('divorceDocLabels', () => {
  it('uses Ontario vocabulary for ON', () => {
    expect(divorceDocLabels('ON')).toMatchObject({
      petition: 'Application for Divorce',
      petitionShort: 'Application',
      decree: 'Divorce Order',
      filingParty: 'Applicant',
    });
    expect(divorceSubDocLabel('divorce_petition', 'on', { short: true })).toBe('Application');
    expect(divorceSubDocLabel('divorce_decree', 'ON')).toBe('Divorce Order');
  });

  it('uses each US jurisdiction\'s own vocabulary', () => {
    expect(divorceDocLabels('UT')).toMatchObject({ petitionShort: 'Petition', decreeShort: 'Decree', filingParty: 'Petitioner' });
    for (const code of ['GA', 'NY', 'AL', 'MI', 'NJ', 'PA', 'MD', 'NC']) {
      expect(divorceDocLabels(code)).toMatchObject({
        petitionShort: 'Complaint',
        filingParty: 'Plaintiff',
        respondingParty: 'Defendant',
      });
    }
    expect(divorceSubDocLabel('divorce_decree', 'CA', { short: true })).toBe('Judgment');
    expect(divorceSubDocLabel('judgment_dissolution', 'CA', { short: true })).toBe('Judgment');
    expect(divorceSubDocLabel('divorce_decree', 'GA')).toBe('Final Judgment and Decree of Divorce');
  });

  it('falls back to generic terms for unknown jurisdictions', () => {
    for (const code of ['', null, undefined, 'ZZ']) {
      expect(divorceSubDocLabel('divorce_petition', code, { short: true })).toBe('Petition');
      expect(divorceSubDocLabel('divorce_decree', code, { short: true })).toBe('Decree');
    }
  });

  it('leaves non-core sub-documents to the caller', () => {
    expect(divorceSubDocLabel('parenting_plan', 'ON')).toBeNull();
    expect(divorceSubDocLabel(null, 'ON')).toBeNull();
  });

  it('slugs labels for filenames', () => {
    expect(labelSlug('Application for Divorce')).toBe('application-for-divorce');
    expect(labelSlug('Divorce Petition')).toBe('divorce-petition');
  });

  // The data is derived from the templates; re-derive and compare so a
  // template title change cannot silently desync the UI.
  it('matches a fresh derivation from the templates (run node scripts/buildDivorceDocLabels.js)', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { build } = require('../../scripts/buildDivorceDocLabels.js');
    const committed = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'lib/divorceDocLabels.data.json'), 'utf8'));
    expect(build()).toEqual(committed);
  });
});

describe('describeGenerateError', () => {
  it('names the missing fields from a 422 MissingRequiredFields body', () => {
    const msg = describeGenerateError(422, {
      error: 'Document cannot be generated: missing required fields — respondent name',
      errorType: 'MissingRequiredFields',
      missingFields: ['respondent name', 'marriage date'],
    }, 'Divorce Order');
    expect(msg).toBe(
      "Your Divorce Order draft can't be created yet. It still needs: respondent name, marriage date. Tell me these in the chat, then download again.",
    );
  });

  it('passes through the server reason otherwise', () => {
    expect(describeGenerateError(400, { error: 'State selection is required before generating a document' }))
      .toContain('State selection is required');
  });

  it('falls back to the status when the body is not JSON', () => {
    expect(describeGenerateError(502, null)).toContain('server error 502');
  });
});
