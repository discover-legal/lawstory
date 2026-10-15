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

  it('keeps US vocabulary for UT and unknown jurisdictions', () => {
    for (const code of ['UT', '', null, undefined, 'ZZ']) {
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

  // The UI names must match what the drafts themselves are titled.
  it.each([
    ['ON', 'ontario'],
    ['AB', 'alberta'],
    ['BC', 'british_columbia'],
    ['MB', 'manitoba'],
    ['YT', 'yukon'],
    ['NL', 'newfoundland'],
  ])('%s labels match the %s templates\' document titles', (code, dir) => {
    const read = (file: string) =>
      fs.readFileSync(path.join(process.cwd(), 'templates/states', dir, file), 'utf8');
    const title = (src: string) => /this\.documentTitle\s*=\s*'([^']+)'/.exec(src)?.[1];
    const labels = divorceDocLabels(code);
    expect(title(read('DivorcePetitionTemplate.js'))).toBe(labels.petition.toUpperCase());
    expect(title(read('DivorceDecreeTemplate.js'))).toBe(labels.decree.toUpperCase());
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
