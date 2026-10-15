/** @jest-environment node */
/**
 * getCurrentUser first-sign-in race: two concurrent first requests both
 * INSERT; ON CONFLICT (auth0_id) only arbitrates that index, so the loser
 * can fail on users_email_key (Postgres 23505). The loser must recover the
 * winner's row (inside a SAVEPOINT), not 500.
 */

const mockQuery = jest.fn();
jest.mock('@/lib/db', () => ({
  query: (...args: unknown[]) => mockQuery(...args),
  withRLSBypass: async (fn: () => Promise<unknown>) => fn(),
}));
jest.mock('@/lib/auth0', () => ({
  auth0: { getSession: async () => ({ user: { sub: 'auth0|race1', email: 'r@example.com', name: 'R' } }) },
}));

import { getCurrentUser } from '@/lib/auth';

const ROW = { id: 7, auth0_id: 'auth0|race1', email: 'r@example.com', name: 'R', tos_accepted: false, tos_version_accepted: null };

beforeEach(() => mockQuery.mockReset());

test('a lost provisioning race re-reads the winner\'s row', async () => {
  const sql: string[] = [];
  mockQuery.mockImplementation(async (text: string) => {
    sql.push(text.trim().split(/\s+/).slice(0, 3).join(' '));
    if (/^SELECT/.test(text.trim())) return { rows: sql.filter((s) => s.startsWith('SELECT')).length === 1 ? [] : [ROW] };
    if (/^INSERT/.test(text.trim())) throw Object.assign(new Error('duplicate key value violates unique constraint "users_email_key"'), { code: '23505' });
    return { rows: [] };
  });
  const user = await getCurrentUser();
  expect(user?.id).toBe(7);
  expect(sql).toEqual(expect.arrayContaining(['SAVEPOINT user_provision', 'ROLLBACK TO SAVEPOINT']));
});

test('a non-unique-violation insert error still throws', async () => {
  mockQuery.mockImplementation(async (text: string) => {
    if (/^SELECT/.test(text.trim())) return { rows: [] };
    if (/^INSERT/.test(text.trim())) throw Object.assign(new Error('boom'), { code: '57014' });
    return { rows: [] };
  });
  await expect(getCurrentUser()).rejects.toThrow('boom');
});
