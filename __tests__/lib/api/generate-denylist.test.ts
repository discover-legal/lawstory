/** @jest-environment node */
/**
 * Extends the placeholder guard for the CA v7 replay tokens:
 * `[DATE OF SEPARATION]` (Alison, CA III¶6), `[CASE NUMBER]`, and
 * `[BIRTH DATE]` (Marcus, ON decree) must trip the /api/documents/generate
 * denylist and return 422 before pdfService renders anything. A structure
 * without any denylisted tokens must render (200).
 */

import fs from 'node:fs';
import path from 'node:path';
import { NextRequest } from 'next/server';
import { placeholder } from '@/templates/core/placeholders';

const mockQuery = jest.fn();
let mockProfile: () => unknown = () => ({ profile: {}, facts: [] });

let currentBuilder: (...args: unknown[]) => unknown = () => ({});

jest.mock('@/lib/api/auth', () => ({
  withAuth: (handler: Function) => (req: Request) =>
    handler(req, { params: {}, user: { id: 9 } }),
}));
jest.mock('@/lib/db', () => ({ query: (...args: unknown[]) => mockQuery(...args) }));
jest.mock('@/lib/api/rateLimit', () => ({
  checkRateLimit: () => ({ ok: true }),
  RATE_LIMITS: { pdf: {}, pdfDaily: {} },
}));
jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));
jest.mock('@/lib/api/services', () => ({
  getServices: async () => ({
    templateManager: {
      generateDivorcePetition: (...args: unknown[]) => currentBuilder(...args),
      generateDivorceDecree: (...args: unknown[]) => currentBuilder(...args),
      generateAffidavit: (...args: unknown[]) => currentBuilder(...args),
      hasDocumentType: () => true,
    },
  }),
}));
jest.mock('@/lib/api/stripe', () => ({ paymentsEnabled: () => true }));
jest.mock('@/lib/api/profile', () => ({
  getUserProfile: async () => mockProfile(),
}));

const written: string[] = [];
let seq = 0;
const mockGeneratePDF = jest.fn(async () => {
  const filepath = path.join(process.cwd(), `generate-denylist-test-${++seq}.pdf`);
  written.push(filepath);
  fs.writeFileSync(filepath, '%PDF ok');
  return { success: true, filepath, documentType: 'petition' };
});
jest.mock('@/services/pdfService', () =>
  jest.fn().mockImplementation(() => ({ generatePDF: mockGeneratePDF })),
);

import { POST } from '@/app/api/documents/generate/route';

function post(body: unknown): Promise<Response> {
  return (POST as unknown as (req: Request) => Promise<Response>)(
    new NextRequest('https://discover.legal/api/documents/generate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }),
  );
}

const paidRow = (): { rows: unknown[] } => ({
  rows: [{
    content: { state: 'CA', facts: [] },
    document_type: 'divorce_package',
    payment_status: 'paid',
  }],
});

afterEach(() => {
  jest.clearAllMocks();
  for (const f of written) fs.rmSync(f, { force: true });
  written.length = 0;
});

describe('POST /api/documents/generate denylist (CA v7 replay tokens)', () => {
  test.each([
    ['DATE OF SEPARATION', 'separation date'],
    ['CASE NUMBER',        'case number'],
    ['BIRTH DATE',         'child birth date'],
    ['COUNTY NAME',        'county'],
  ])('rejects with 422 when structure carries the %s marker', async (head, label) => {
    const token = placeholder(head);
    currentBuilder = () => ({
      documentType: 'divorce_petition',
      sections: {
        caption: { petitioner: 'Alison Doe', respondent: 'Sam Doe' },
        body: [{ text: `Something ${token} slipped through.` }],
      },
    });
    mockQuery.mockResolvedValueOnce(paidRow());
    const res = await post({
      documentId: 42,
      affidavitData: { state: 'CA', documentType: 'divorce_petition' },
    });
    expect(res.status).toBe(422);
    expect(mockGeneratePDF).not.toHaveBeenCalled();
    const body = await res.json();
    expect(body.errorType).toBe('MissingRequiredFields');
    expect(body.missingFields).toEqual(expect.arrayContaining([label]));
  });

  // Generic detection (templates/core/placeholders.js): tokens that were
  // never on the old hand-maintained denylist are caught by shape.
  test.each([
    [placeholder('PRIMARY RESIDENCE', 'set out the parent with whom the child(ren) primarily reside'), 'primary residence'],
    [placeholder('ARRANGEMENT', "set out the parties' decision-making agreement"), 'arrangement'],
    [placeholder('COMPLAINANT NAME'), 'complainant name'],
    [placeholder('SOMETHING NEW'), 'something new'],
  ])('guard rejects any template marker (%#)', async (token, label) => {
    currentBuilder = () => ({
      documentType: 'divorce_decree',
      sections: { body: [{ text: `IT IS ORDERED that ${token}.` }] },
    });
    mockQuery.mockResolvedValueOnce(paidRow());
    const res = await post({
      documentId: 42,
      affidavitData: { state: 'ON', documentType: 'divorce_decree' },
    });
    expect(res.status).toBe(422);
    expect(mockGeneratePDF).not.toHaveBeenCalled();
    expect((await res.json()).missingFields).toEqual([label]);
  });

  test('legitimately bracketed text and user text never trip the guard', async () => {
    currentBuilder = () => ({
      documentType: 'divorce_decree',
      sections: {
        body: [
          { text: 'Physical custody of the minor child(ren) is awarded to: [X] Petitioner' },
          { text: '[Print, type, or stamp commissioned name of notary or deputy clerk.]' },
          { text: 'Respondent: [APPEARANCE, SERVICE, AND DEFAULT STATUS — TO BE COMPLETED BY THE COURT].' },
          { text: `${placeholder('NOTARY SEAL')} ${placeholder('SEAL')} ${placeholder('JUDGE SIGNATURE')} Signed on ${placeholder('DATE')}.` },
          { text: '[ ] SNAP (food stamps)' },
          // The user's own words are never placeholders, however they look.
          { text: 'He called me [EXPLETIVE]; the statement is [REDACTED]; we lived in [ON]; Smith v. Jones [ONCA].' },
          { text: '[PETITIONER NAME] typed literally by the user is just text.' },
        ],
      },
    });
    mockQuery.mockResolvedValueOnce(paidRow());
    const res = await post({
      documentId: 42,
      affidavitData: { state: 'UT', documentType: 'divorce_decree' },
    });
    expect(res.status).toBe(200);
  });

  test('renders when structure contains none of the denylisted tokens', async () => {
    currentBuilder = () => ({
      documentType: 'divorce_petition',
      sections: {
        caption: { petitioner: 'Alison Doe', respondent: 'Sam Doe' },
        body: [
          { text: 'The parties separated on or about January 4, 2020.' },
          { text: 'Signed on [DATE].' },
        ],
      },
    });
    mockQuery.mockResolvedValueOnce(paidRow());
    const res = await post({
      documentId: 42,
      affidavitData: { state: 'CA', documentType: 'divorce_petition' },
    });
    expect(res.status).toBe(200);
    expect(mockGeneratePDF).toHaveBeenCalledTimes(1);
    expect(res.headers.get('content-type')).toBe('application/pdf');
  });

  test("a document's own facts win over the profile's (saved wins) and print verbatim", async () => {
    let received: Record<string, unknown> | null = null;
    mockProfile = () => ({ profile: {}, facts: [{ content: 'profile fact' }] });
    currentBuilder = (_state: unknown, data: unknown) => {
      received = data as Record<string, unknown>;
      return { documentType: 'affidavit', sections: { facts: { items: [{ number: 1, content: 'The account is [REDACTED].' }] } } };
    };
    mockQuery.mockResolvedValueOnce({
      rows: [{ content: { state: 'CA', facts: [{ content: 'The account is [REDACTED].' }] }, document_type: 'affidavit', payment_status: 'paid' }],
    });
    const res = await post({
      documentId: 42,
      affidavitData: { state: 'CA', documentType: 'affidavit', facts: [{ content: 'The account is [REDACTED].' }] },
    });
    expect(res.status).toBe(200);
    expect((received as unknown as { facts: Array<{ content: string }> }).facts[0].content).toBe('The account is [REDACTED].');
    mockProfile = () => ({ profile: {}, facts: [] });
  });
});
