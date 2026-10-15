import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { query, withRLSBypass } from '@/lib/db';
import { checkRateLimit } from '@/lib/api/rateLimit';
import { readBody } from '@/lib/api/requestBody';
import { rateLimitKey } from '@/lib/util/clientIp';
import { ValidationError, toErrorResponse } from '@/lib/api/errors';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/contact — the no-JavaScript contact form on /contact.
 *
 * Public by design (documented reason): it is how visitors without
 * JavaScript reach us, since the email address is only ever assembled in the
 * browser. Guarded by an IP-keyed rate limit (rateLimitKey), the proxy's
 * Origin check and body cap, a honeypot field, and strict length limits.
 *
 * There is no outbound mail transport, so messages are stored in
 * contact_messages (migration 023) for the owner to read.
 *
 * A browser form post (urlencoded) gets a 303 back to /contact with a status
 * flag; a JSON client gets JSON.
 */

const CONTACT_LIMIT = { max: 5, windowMs: 60 * 60 * 1000, failClosed: true } as const;
const MAX_BODY_BYTES = 16 * 1024;

const schema = z.object({
  name: z.string().trim().min(1).max(200),
  email: z.string().trim().email().max(254),
  message: z.string().trim().min(1).max(5000),
  // Honeypot: hidden from people, filled by naive bots.
  website: z.string().max(2000).optional(),
});

function back(status: 'sent' | 'invalid' | 'busy' | 'error'): Response {
  // Relative Location: correct behind any proxy, valid per RFC 7231.
  return new Response(null, {
    status: 303,
    headers: { Location: `/contact?status=${status}#contact-form`, 'cache-control': 'no-store' },
  });
}

export async function POST(req: NextRequest) {
  const isForm = (req.headers.get('content-type') || '').includes('application/x-www-form-urlencoded');
  try {
    const limit = await checkRateLimit('contact', rateLimitKey(req, 'contact'), CONTACT_LIMIT);
    if (!limit.ok) {
      return isForm
        ? back('busy')
        : NextResponse.json({ success: false, error: 'Too many requests' }, { status: 429 });
    }

    const raw = new TextDecoder().decode(await readBody(req, MAX_BODY_BYTES));
    let fields: Record<string, unknown>;
    if (isForm) {
      fields = Object.fromEntries(new URLSearchParams(raw));
    } else {
      try {
        fields = JSON.parse(raw) as Record<string, unknown>;
      } catch {
        throw new ValidationError('Invalid JSON');
      }
    }

    const parsed = schema.safeParse(fields);
    if (!parsed.success) {
      return isForm
        ? back('invalid')
        : NextResponse.json({ success: false, error: 'Please give your name, a valid email and a message.' }, { status: 400 });
    }
    if (parsed.data.website) {
      // Honeypot tripped: answer as if it worked, store nothing.
      return isForm ? back('sent') : NextResponse.json({ success: true });
    }

    const inserted = await withRLSBypass(() =>
      query<{ id: number }>(
        'INSERT INTO contact_messages (name, email, message) VALUES ($1, $2, $3) RETURNING id',
        [parsed.data.name, parsed.data.email, parsed.data.message],
      ),
    );
    // No personal data in logs: the id is enough to find the row.
    logger.info('contact_message_received', { id: inserted.rows[0]?.id });

    return isForm ? back('sent') : NextResponse.json({ success: true });
  } catch (err) {
    logger.error('contact_message_failed', { error: err instanceof Error ? err.message : String(err) });
    return isForm ? back('error') : toErrorResponse(err);
  }
}
