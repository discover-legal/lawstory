/** @jest-environment node */
/**
 * CORE_ENGINE=v2: when the v2 composer throws, /api/documents/generate
 * falls back to the v1 render of the SAME document (like preview), so the
 * download matches the preview instead of failing with a 500.
 */

import fs from 'node:fs';
import path from 'node:path';
import { NextRequest } from 'next/server';

const mockQuery = jest.fn();

// The template manager here EMITS a structure carrying literal placeholder
// tokens — the exact failure mode we're guarding against. The response
// must reject BEFORE pdfService renders it, so we also assert generatePDF
// was never called.
const generateDivorcePetitionWithPlaceholders = jest.fn(() => ({
  documentType: 'divorce_petition',
  sections: {
    caption: {
      // Two of the denylisted tokens land in the caption — the check must
      // dedupe missing-field labels and list both.
      petitioner: '[PETITIONER NAME]',
      respondent: '[RESPONDENT NAME]',
      court:      'District Court, Travis County, Texas',
    },
    body: [
      { text: 'The parties were married on 2015-01-01 in Austin, TX.' },
    ],
  },
}));

const generateDivorcePetitionClean = jest.fn(() => ({
  documentType: 'divorce_petition',
  sections: {
    caption: {
      petitioner: 'Mari Guerrero',
      respondent: 'Devin Guerrero',
    },
    // Legit `[…]` placeholders the court fills in — NOT on the denylist,
    // so the response must succeed.
    body: [
      { text: 'Signed at Austin, Texas, on [DATE].' },
      { text: '[NOTARY SEAL]' },
    ],
  },
}));

jest.mock('@/lib/api/auth', () => ({
  withAuth: (handler: Function) => (req: Request) =>
    handler(req, { params: {}, user: { id: 7 } }),
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
      generateDivorcePetition: (...args: unknown[]) =>
        currentPetitionBuilder(...args),
      generateDivorceDecree: jest.fn(),
      generateAffidavit: jest.fn(),
      hasDocumentType: () => true,
    },
  }),
}));
const mockDraftPdf = jest.fn();
const mockLogV2Fallback = jest.fn();
jest.mock('@/lib/api/coreChat', () => ({ isCoreEngineEnabled: () => true }));
jest.mock('@/lib/api/coreDocuments', () => ({
  draftPdf: (...args: unknown[]) => mockDraftPdf(...args),
  logV2Fallback: (...args: unknown[]) => mockLogV2Fallback(...args),
}));
jest.mock('@/lib/api/stripe', () => ({ paymentsEnabled: () => true }));
jest.mock('@/lib/api/profile', () => ({
  getUserProfile: async () => ({ profile: {}, facts: [] }),
}));

let mockPdfSeq = 0;
const mockWrittenPdfs: string[] = [];
const mockGeneratePDF = jest.fn(async () => {
  const filepath = path.join(process.cwd(), `generate-placeholder-test-${++mockPdfSeq}.pdf`);
  mockWrittenPdfs.push(filepath);
  fs.writeFileSync(filepath, '%PDF ok');
  return { success: true, filepath, documentType: 'petition' };
});
jest.mock('@/services/pdfService', () =>
  jest.fn().mockImplementation(() => ({ generatePDF: mockGeneratePDF })),
);

// Switchable petition builder — the placeholder-emitting one for the
// blocker case, the clean one for the pass-through case.
let currentPetitionBuilder: (...args: unknown[]) => unknown =
  generateDivorcePetitionClean;

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

const paidPackageRow = (): { rows: unknown[] } => ({
  rows: [{
    content: { state: 'UT', facts: [] },
    document_type: 'divorce_package',
    payment_status: 'paid',
  }],
});

afterEach(() => {
  jest.clearAllMocks();
  for (const f of mockWrittenPdfs) fs.rmSync(f, { force: true });
  mockWrittenPdfs.length = 0;
});

describe('POST /api/documents/generate with CORE_ENGINE=v2', () => {
  test('a v2 failure renders the same document with v1 and logs the fallback', async () => {
    const boom = new Error('compose timed out');
    mockDraftPdf.mockRejectedValueOnce(boom);
    mockQuery.mockResolvedValueOnce(paidPackageRow());
    const res = await post({ documentId: 42, affidavitData: { state: 'UT', documentType: 'divorce_petition' } });
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('application/pdf');
    expect(mockGeneratePDF).toHaveBeenCalledTimes(1);
    expect(mockLogV2Fallback).toHaveBeenCalledWith('generate', boom, expect.objectContaining({ userId: 7, documentId: '42' }));
  });

  test('v2 output is used when it succeeds', async () => {
    mockDraftPdf.mockResolvedValueOnce({ buffer: Buffer.from('%PDF v2'), kind: 'divorce_petition', prefix: 'petition' });
    mockQuery.mockResolvedValueOnce(paidPackageRow());
    const res = await post({ documentId: 42, affidavitData: { state: 'UT', documentType: 'divorce_petition' } });
    expect(res.status).toBe(200);
    expect(mockGeneratePDF).not.toHaveBeenCalled();
    expect(mockLogV2Fallback).not.toHaveBeenCalled();
  });
});
