/** @jest-environment node */
/**
 * Rename must reach the editor: the editor's Document Title field (and every
 * save, which writes it back into `title`) reads `content.documentTitle`, so
 * renaming only the `title` column left the editor stale and let the next
 * autosave revert the name.
 */
import { NextRequest } from 'next/server';
import { documentReducer, ActionTypes } from '@/contexts/DocumentContext';

const mockQuery = jest.fn();
jest.mock('@/lib/api/auth', () => ({
  withAuth: (handler: Function) => (req: Request, ctx: { params: unknown }) =>
    handler(req, { params: ctx.params, user: { id: 7 } }),
}));
jest.mock('@/lib/db', () => ({ query: (...args: unknown[]) => mockQuery(...args) }));
jest.mock('@/lib/api/rateLimit', () => ({
  checkRateLimit: () => ({ ok: true }),
  RATE_LIMITS: { standard: {} },
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PUT } = require('@/app/api/documents/[id]/rename/route');

describe('PUT /api/documents/:id/rename', () => {
  beforeEach(() => mockQuery.mockReset().mockResolvedValue({ rowCount: 1, rows: [{ id: 5 }] }));

  it('updates the title column AND content.documentTitle, scoped to the owner', async () => {
    const req = new NextRequest('http://localhost/api/documents/5/rename', {
      method: 'PUT',
      body: JSON.stringify({ newName: '  Jordan — final  ' }),
    });
    const res = await PUT(req, { params: { id: '5' } });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true, id: 5, title: 'Jordan — final' });

    const [sql, params] = mockQuery.mock.calls[0];
    // Same parameter for both targets: typed explicitly so Postgres does not
    // deduce varchar for one use and text for the other.
    expect(sql).toMatch(/SET title = \$1::text/);
    expect(sql).toMatch(/jsonb_set\(content, '\{documentTitle\}', to_jsonb\(\$1::text\)/);
    expect(sql).toMatch(/WHERE id = \$2 AND user_id = \$3/);
    // A rename is metadata, never a content edit (migration 019).
    expect(sql).not.toMatch(/edit_revision/);
    expect(params).toEqual(['Jordan — final', 5, 7]);
  });

  it('404s when the document is not the caller\'s', async () => {
    mockQuery.mockResolvedValue({ rowCount: 0, rows: [] });
    const req = new NextRequest('http://localhost/api/documents/5/rename', {
      method: 'PUT',
      body: JSON.stringify({ title: 'x' }),
    });
    const res = await PUT(req, { params: { id: '5' } });
    expect(res.status).toBe(404);
  });
});

describe('APPLY_RENAME reducer', () => {
  const base = {
    currentDocument: { documentId: 5, documentTitle: '', state: 'UT' },
    hasUnsavedChanges: false,
  };

  it('updates the open document\'s title without marking it unsaved', () => {
    const next = documentReducer(base, {
      type: ActionTypes.APPLY_RENAME,
      payload: { documentId: '5', title: 'Jordan — final' },
    });
    expect(next.currentDocument.documentTitle).toBe('Jordan — final');
    expect(next.currentDocument.state).toBe('UT');
    expect(next.hasUnsavedChanges).toBe(false);
  });

  it('ignores a rename of a different document', () => {
    const next = documentReducer(base, {
      type: ActionTypes.APPLY_RENAME,
      payload: { documentId: 6, title: 'other' },
    });
    expect(next).toBe(base);
  });
});
