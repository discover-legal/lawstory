/** @jest-environment node */
/**
 * Evidence fileKey contract: upload + list return the canonical storage key
 * `<userId>/<documentId>/<file>`; GET/DELETE must accept exactly that (as
 * one URL-encoded segment) as well as the bare file name — and nothing that
 * escapes the caller's own user/document sandbox.
 */
import { NextRequest } from 'next/server';
import { resolveEvidenceKey } from '@/lib/api/evidenceKey';
import { ValidationError } from '@/lib/api/errors';

describe('resolveEvidenceKey', () => {
  it('accepts the canonical key returned by upload/list', () => {
    expect(resolveEvidenceKey('2/2/marriage_cert_1.png', 2, 2)).toEqual({
      fileName: 'marriage_cert_1.png',
      storageKey: '2/2/marriage_cert_1.png',
    });
  });

  it('accepts the canonical key still percent-encoded', () => {
    expect(resolveEvidenceKey('2%2F2%2Fmarriage_cert_1.png', 2, 2).storageKey)
      .toBe('2/2/marriage_cert_1.png');
  });

  it('accepts a bare file name (older callers) and roots it in the sandbox', () => {
    expect(resolveEvidenceKey('marriage_cert_1.png', 2, 2).storageKey)
      .toBe('2/2/marriage_cert_1.png');
  });

  it.each([
    ['another user', '3/2/x.png'],
    ['another document', '2/9/x.png'],
    ['traversal', '2/2/../x.png'],
    ['traversal (encoded)', '..%2F..%2Fetc%2Fpasswd'],
    ['deeper path', '2/2/sub/x.png'],
    ['absolute path', '/2/2/x.png'],
    ['backslash', '2\\2\\x.png'],
    ['bad characters', '2/2/x;rm.png'],
    ['bad encoding', '%E0%A4%A'],
    ['empty', ''],
  ])('refuses %s', (_label, raw) => {
    expect(() => resolveEvidenceKey(raw, 2, 2)).toThrow(ValidationError);
  });
});

const mockQuery = jest.fn();
const mockGetEvidence = jest.fn();
const mockDeleteEvidence = jest.fn();

jest.mock('@/lib/api/auth', () => ({
  withAuth: (handler: Function) => (req: Request, ctx: { params: unknown }) =>
    handler(req, { params: ctx.params, user: { id: 2 } }),
}));
jest.mock('@/lib/db', () => ({ query: (...args: unknown[]) => mockQuery(...args) }));
jest.mock('@/lib/api/rateLimit', () => ({
  checkRateLimit: () => ({ ok: true }),
  RATE_LIMITS: { standard: {} },
}));
jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));
jest.mock('@/services/evidenceStorage', () => ({
  getEvidence: (...args: unknown[]) => mockGetEvidence(...args),
  deleteEvidence: (...args: unknown[]) => mockDeleteEvidence(...args),
}));
jest.mock('node:fs', () => {
  const actual = jest.requireActual('node:fs');
  return { ...actual, promises: { ...actual.promises, readFile: async () => Buffer.from('png') } };
});

// eslint-disable-next-line @typescript-eslint/no-require-imports
const route = require('@/app/api/evidence/[documentId]/[fileKey]/route');

describe('GET/DELETE /api/evidence/:documentId/:fileKey', () => {
  beforeEach(() => {
    mockQuery.mockReset().mockResolvedValue({ rows: [{ user_id: 2 }] });
    mockGetEvidence.mockReset().mockResolvedValue({ filepath: '/x/2/2/marriage_cert_1.png', exists: true });
    mockDeleteEvidence.mockReset().mockResolvedValue({ success: true });
  });

  const req = (method: string) =>
    new NextRequest('http://localhost/api/evidence/2/x', { method });

  it('GET serves the file for the canonical key the list returned', async () => {
    const res = await route.GET(req('GET'), { params: { documentId: '2', fileKey: '2/2/marriage_cert_1.png' } });
    expect(res.status).toBe(200);
    expect(mockGetEvidence).toHaveBeenCalledWith(2, 2, '2/2/marriage_cert_1.png');
  });

  it('DELETE removes the file for the canonical key and echoes it', async () => {
    const res = await route.DELETE(req('DELETE'), { params: { documentId: '2', fileKey: '2%2F2%2Fmarriage_cert_1.png' } });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true, deleted: '2/2/marriage_cert_1.png' });
    expect(mockDeleteEvidence).toHaveBeenCalledWith(2, 2, '2/2/marriage_cert_1.png', undefined);
  });

  it('refuses a key for another user before touching storage', async () => {
    const res = await route.GET(req('GET'), { params: { documentId: '2', fileKey: '7/2/x.png' } });
    expect(res.status).toBe(400);
    expect(mockGetEvidence).not.toHaveBeenCalled();
  });

  it('DELETE of a file that is not there answers 404', async () => {
    mockDeleteEvidence.mockResolvedValue({ success: false, notFound: true });
    const res = await route.DELETE(req('DELETE'), { params: { documentId: '2', fileKey: '2/2/gone.png' } });
    expect(res.status).toBe(404);
  });

  it('still checks document ownership', async () => {
    mockQuery.mockResolvedValue({ rows: [{ user_id: 99 }] });
    const res = await route.DELETE(req('DELETE'), { params: { documentId: '2', fileKey: '2/2/x.png' } });
    expect(res.status).toBe(403);
    expect(mockDeleteEvidence).not.toHaveBeenCalled();
  });
});
