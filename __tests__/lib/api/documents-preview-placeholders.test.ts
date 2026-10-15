/** @jest-environment node */
/**
 * /api/documents/preview shows exactly what the download will:
 *   - template placeholder MARKERS become fill-in blanks (never "[PETITIONER
 *     NAME]" in the editor), while the user's own bracketed text — "[REDACTED]",
 *     "Smith v. Jones [ONCA]" — is left exactly as written;
 *   - a jurisdiction the deployment does not serve gets a clear notice, never
 *     another jurisdiction's caption from the generic fallback.
 */

import { NextRequest } from 'next/server';
import { placeholder } from '@/templates/core/placeholders';

let currentDocument: unknown = null;

jest.mock('@/lib/api/auth', () => ({
  withAuth: (handler: Function) => (req: Request) => handler(req, { params: {}, user: { id: 5 } }),
}));
jest.mock('@/lib/api/rateLimit', () => ({
  checkRateLimit: () => ({ ok: true }),
  RATE_LIMITS: { standard: {} },
}));
jest.mock('@/lib/logger', () => ({ logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } }));
jest.mock('@/lib/api/coreChat', () => ({ isCoreEngineEnabled: () => false }));
jest.mock('@/lib/api/coreDocuments', () => ({ draftPreview: async () => null }));
jest.mock('@/lib/api/services', () => ({
  getServices: async () => ({
    templateManager: {
      hasDocumentType: () => true,
      generateDocument: () => currentDocument,
      generateAffidavit: () => currentDocument,
    },
  }),
}));

import { POST } from '@/app/api/documents/preview/route';

async function preview(affidavitData: Record<string, unknown>): Promise<{ preview: { sections: Record<string, unknown> } }> {
  const res = await (POST as unknown as (req: Request) => Promise<Response>)(
    new NextRequest('https://discover.legal/api/documents/preview', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ affidavitData }),
    }),
  );
  return res.json();
}

const ORIGINAL_ALLOWLIST = process.env.JURISDICTION_ALLOWLIST;
afterEach(() => {
  if (ORIGINAL_ALLOWLIST === undefined) delete process.env.JURISDICTION_ALLOWLIST;
  else process.env.JURISDICTION_ALLOWLIST = ORIGINAL_ALLOWLIST;
});

test('markers become blanks; the user\'s own bracketed text survives untouched', async () => {
  process.env.JURISDICTION_ALLOWLIST = 'ON,UT';
  currentDocument = {
    sections: {
      parties: { title: 'PARTIES', items: [{ number: 1, content: `Applicant, ${placeholder('PETITIONER NAME')}, resides in Toronto.` }] },
      facts: { items: [{ number: 2, content: 'The bank statement is [REDACTED]; see Smith v. Jones [ONCA].' }] },
    },
    htmlContent: `<p>${placeholder('COURT FILE NUMBER')}</p>`,
  };
  const body = await preview({ state: 'ON', documentType: 'divorce_petition' });
  const text = JSON.stringify(body.preview);
  expect(text).not.toContain('');
  expect(text).toContain('Applicant, ______________, resides in Toronto.');
  expect(text).toContain('The bank statement is [REDACTED]; see Smith v. Jones [ONCA].');
});

test('a jurisdiction outside the allowlist gets a clear notice, not a generic US caption', async () => {
  process.env.JURISDICTION_ALLOWLIST = 'UT';
  const body = await preview({ state: 'ON', county: 'Toronto', documentType: 'divorce_petition' });
  const text = JSON.stringify(body.preview);
  expect(text).toContain('Drafts for Ontario are not available on this site yet');
  expect(text).not.toMatch(/IN RE THE MARRIAGE|CAUSE NO\./);
});
