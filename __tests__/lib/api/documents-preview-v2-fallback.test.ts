/** @jest-environment node */
/**
 * CORE_ENGINE=v2 preview failures must not silently show a different kind of
 * document. Before: a v2 throw fell to the catch-all, which answered
 * `success: true` with a generic AFFIDAVIT placeholder for a divorce
 * petition. Now: v1 (the default engine) renders the SAME document, and the
 * last-resort placeholder keeps the document kind.
 */
import { NextRequest } from 'next/server';

const mockDraftPreview = jest.fn();
const mockGeneratePetition = jest.fn();
let mockServicesFail = false;

jest.mock('@/lib/api/auth', () => ({
  withAuth: (handler: Function) => (req: Request) => handler(req, { params: {}, user: { id: 3 } }),
}));
jest.mock('@/lib/api/rateLimit', () => ({
  checkRateLimit: () => ({ ok: true }),
  RATE_LIMITS: { standard: {} },
}));
jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));
jest.mock('@/lib/api/coreChat', () => ({ isCoreEngineEnabled: () => true }));
jest.mock('@/lib/api/coreDocuments', () => ({
  draftPreview: (...args: unknown[]) => mockDraftPreview(...args),
}));
jest.mock('@/lib/api/services', () => ({
  getServices: async () => {
    if (mockServicesFail) throw new Error('services down');
    return {
      templateManager: {
        hasDocumentType: () => true,
        generateDocument: (...args: unknown[]) => mockGeneratePetition(...args),
        generateDivorcePetition: (...args: unknown[]) => mockGeneratePetition(...args),
        generateAffidavit: jest.fn(),
      },
    };
  },
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { POST } = require('@/app/api/documents/preview/route');

const petitionRequest = () =>
  new NextRequest('http://localhost/api/documents/preview', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      affidavitData: {
        state: 'ON',
        documentType: 'divorce_package',
        activeSubDocument: 'divorce_petition',
        petitionerName: 'Jordan Example',
        facts: [],
      },
    }),
  });

describe('POST /api/documents/preview with CORE_ENGINE=v2', () => {
  beforeEach(() => {
    mockServicesFail = false;
    mockDraftPreview.mockReset().mockRejectedValue(new Error('compose timed out'));
    mockGeneratePetition.mockReset().mockReturnValue({
      sections: { title: 'APPLICATION FOR DIVORCE' },
      htmlContent: '<h1>APPLICATION FOR DIVORCE</h1>',
    });
  });

  it('falls back to the v1 render of the same document when v2 throws', async () => {
    const res = await POST(petitionRequest());
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.preview.sections).toEqual({ title: 'APPLICATION FOR DIVORCE' });
    expect(body.metadata).toMatchObject({ engine: 'v1', v2Failed: true });
    expect(mockGeneratePetition).toHaveBeenCalled();
  });

  it('never degrades a divorce draft into an affidavit placeholder', async () => {
    mockServicesFail = true;
    const res = await POST(petitionRequest());
    const body = await res.json();
    expect(body.metadata).toMatchObject({ fallback: true, degraded: true });
    expect(body.preview.sections.title).toBe('APPLICATION FOR DIVORCE');
    expect(body.preview.sections.title).not.toBe('AFFIDAVIT');
    expect(body.preview.metadata.documentType).toBe('divorce_petition');
    // Flagged so the editor says this is an outline, not the draft.
    expect(body.preview.metadata.degraded).toBe(true);
  });

  it('serves v2 when it succeeds', async () => {
    mockDraftPreview.mockResolvedValue({ sections: { title: 'v2' }, htmlContent: '', blanks: [], kind: 'divorce_petition' });
    const body = await (await POST(petitionRequest())).json();
    expect(body.metadata.engine).toBe('v2');
    expect(mockGeneratePetition).not.toHaveBeenCalled();
  });
});
