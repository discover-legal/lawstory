/** @jest-environment node */
/**
 * POST /api/contact — the no-JavaScript contact form. Public route: guarded
 * by an IP-keyed rate limit, a honeypot and strict validation; stores the
 * message (no mail transport) and answers form posts with a 303.
 */
import { NextRequest } from 'next/server';

const mockQuery = jest.fn();
const mockLimit = jest.fn();
jest.mock('@/lib/db', () => ({
  query: (...args: unknown[]) => mockQuery(...args),
  withRLSBypass: (fn: () => unknown) => fn(),
}));
jest.mock('@/lib/api/rateLimit', () => ({
  checkRateLimit: (...args: unknown[]) => mockLimit(...args),
}));
jest.mock('@/lib/logger', () => ({ logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } }));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { POST } = require('@/app/api/contact/route');

const form = (fields: Record<string, string>) => {
  const body = new URLSearchParams(fields).toString();
  return new NextRequest('http://localhost/api/contact', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', 'content-length': String(body.length), 'x-forwarded-for': '203.0.113.9' },
    body,
  });
};

beforeEach(() => {
  mockQuery.mockReset().mockResolvedValue({ rows: [{ id: 1 }] });
  mockLimit.mockReset().mockResolvedValue({ ok: true });
});

it('stores a valid form post and redirects back with status=sent', async () => {
  const res = await POST(form({ name: 'Ada', email: 'ada@example.com', message: 'Hello', website: '' }));
  expect(res.status).toBe(303);
  expect(res.headers.get('location')).toBe('/contact?status=sent#contact-form');
  const [sql, params] = mockQuery.mock.calls[0];
  expect(sql).toMatch(/INSERT INTO contact_messages \(name, email, message\)/);
  expect(params).toEqual(['Ada', 'ada@example.com', 'Hello']);
  expect(mockLimit).toHaveBeenCalledWith('contact', expect.any(String), expect.objectContaining({ max: 5 }));
});

it('rejects invalid input without storing it', async () => {
  const res = await POST(form({ name: '', email: 'not-an-email', message: '' }));
  expect(res.headers.get('location')).toBe('/contact?status=invalid#contact-form');
  expect(mockQuery).not.toHaveBeenCalled();
});

it('silently drops honeypot submissions', async () => {
  const res = await POST(form({ name: 'Bot', email: 'bot@example.com', message: 'spam', website: 'http://spam' }));
  expect(res.headers.get('location')).toBe('/contact?status=sent#contact-form');
  expect(mockQuery).not.toHaveBeenCalled();
});

it('rate-limits before reading or storing', async () => {
  mockLimit.mockResolvedValue({ ok: false });
  const res = await POST(form({ name: 'Ada', email: 'ada@example.com', message: 'Hello' }));
  expect(res.headers.get('location')).toBe('/contact?status=busy#contact-form');
  expect(mockQuery).not.toHaveBeenCalled();
});

it('answers JSON clients with JSON', async () => {
  const body = JSON.stringify({ name: 'Ada', email: 'ada@example.com', message: 'Hi' });
  const res = await POST(new NextRequest('http://localhost/api/contact', {
    method: 'POST', headers: { 'content-type': 'application/json', 'content-length': String(body.length) }, body,
  }));
  expect(res.status).toBe(200);
  expect(await res.json()).toEqual({ success: true });
});
