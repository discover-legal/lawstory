/** @jest-environment node */
/**
 * Rename × save × payment, against a REAL Postgres (the SQL is the thing
 * under test: jsonb_set, the documentTitle-insensitive payment comparison,
 * and optimistic concurrency on edit_revision).
 *
 * Runs only when TEST_DATABASE_URL points at a migrated database, e.g.
 *   TEST_DATABASE_URL=postgresql://affidavit:affidavit@127.0.0.1:5433/affidavit_app \
 *     npx jest __tests__/db
 * Skipped otherwise (the unit suite needs no database).
 */
import { NextRequest } from 'next/server';

const DB_URL = process.env.TEST_DATABASE_URL;
if (DB_URL) process.env.DATABASE_URL = DB_URL;

const USER = { id: 0 };
jest.mock('@/lib/api/auth', () => ({
  withAuth: (handler: Function) => (req: Request, ctx: { params: unknown }) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { withRLSContext } = require('@/lib/db');
    return withRLSContext(USER.id, false, () =>
      handler(req, { params: ctx?.params ?? {}, user: { id: USER.id } }));
  },
}));
jest.mock('@/lib/api/rateLimit', () => ({
  checkRateLimit: () => ({ ok: true }),
  RATE_LIMITS: { standard: {} },
}));

const run = DB_URL ? describe : describe.skip;

run('rename vs save vs payment (real Postgres)', () => {
  /* eslint-disable @typescript-eslint/no-require-imports */
  const db = DB_URL ? require('@/lib/db') : null;
  const rename = DB_URL ? require('@/app/api/documents/[id]/rename/route') : null;
  const save = DB_URL ? require('@/app/api/documents/save/route') : null;
  /* eslint-enable @typescript-eslint/no-require-imports */
  let docId = 0;

  const asSystem = <T,>(sql: string, params: unknown[]) =>
    db.withRLSBypass(() => db.query(sql, params)) as Promise<{ rows: T[] }>;

  beforeAll(async () => {
    const sub = `pgtest|${Date.now()}`;
    const u = await asSystem<{ id: number }>(
      `INSERT INTO users (auth0_id, email, name) VALUES ($1, $2, 'PG Test') RETURNING id`,
      [sub, `${Date.now()}@pgtest.invalid`],
    );
    USER.id = u.rows[0].id;
    const content = { documentType: 'divorce_package', state: 'UT', affiantName: 'Pat Example', documentTitle: '', facts: [{ id: 'f1', content: 'x' }] };
    const d = await asSystem<{ id: number }>(
      `INSERT INTO documents (user_id, title, document_type, template_state, content, status, payment_status)
       VALUES ($1, '', 'divorce_package', 'UT', $2::jsonb, 'draft', 'paid') RETURNING id`,
      [USER.id, JSON.stringify(content)],
    );
    docId = d.rows[0].id;
    // Saved documents carry their own id in the blob (the editor sends it).
    await asSystem(`UPDATE documents SET content = content || jsonb_build_object('documentId', id) WHERE id = $1`, [docId]);
  });

  afterAll(async () => {
    await asSystem('DELETE FROM documents WHERE user_id = $1', [USER.id]);
    await asSystem('DELETE FROM users WHERE id = $1', [USER.id]);
    const pool = await db.getPool();
    await pool.end();
  });

  const row = async () =>
    (await asSystem<{ title: string; content: Record<string, unknown>; edit_revision: string; payment_status: string }>(
      'SELECT title, content, edit_revision, payment_status FROM documents WHERE id = $1', [docId],
    )).rows[0];

  const saveAs = async (affidavitData: Record<string, unknown>, expectedRevision: number) => {
    const body = { affidavitData: { ...affidavitData, documentId: docId }, title: 'ignored', content: '{}', expectedRevision };
    const res = await save.POST(new NextRequest('http://localhost/api/documents/save', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
    }), { params: {} });
    return { status: res.status, body: await res.json() };
  };

  it('renames title + content.documentTitle, bumps the revision, keeps payment', async () => {
    const before = await row();
    const res = await rename.PUT(new NextRequest(`http://localhost/api/documents/${docId}/rename`, {
      method: 'PUT', body: JSON.stringify({ newName: 'Renamed draft' }),
    }), { params: { id: String(docId) } });
    const body = await res.json();
    const after = await row();
    expect(res.status).toBe(200);
    expect(after.title).toBe('Renamed draft');
    expect(after.content.documentTitle).toBe('Renamed draft');
    expect(Number(after.edit_revision)).toBe(Number(before.edit_revision) + 1);
    expect(body.editRevision).toBe(Number(after.edit_revision));
    expect(after.payment_status).toBe('paid');
  });

  it('a stale tab (old revision) gets 409 and cannot revert the name', async () => {
    const current = await row();
    const stale = Number(current.edit_revision) - 1;
    const { status, body } = await saveAs({ ...current.content, documentTitle: '' }, stale);
    expect(status).toBe(409);
    expect(body.errorType).toBe('DocumentConflict');
    const after = await row();
    expect(after.title).toBe('Renamed draft');
    expect(after.payment_status).toBe('paid');
  });

  it('the renaming tab (adopted revision) keeps saving; title-only changes keep payment', async () => {
    const current = await row();
    const { status } = await saveAs({ ...current.content, documentTitle: 'Renamed again' }, Number(current.edit_revision));
    expect(status).toBe(200);
    const after = await row();
    expect(after.title).toBe('Renamed again');
    expect(after.payment_status).toBe('paid');
  });

  it('a material content change still revokes payment', async () => {
    const current = await row();
    const { status } = await saveAs({ ...current.content, facts: [{ id: 'f1', content: 'changed' }] }, Number(current.edit_revision));
    expect(status).toBe(200);
    expect((await row()).payment_status).toBe('unpaid');
  });
});
