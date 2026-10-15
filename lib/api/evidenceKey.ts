import path from 'node:path';
import { ValidationError } from '@/lib/api/errors';

/**
 * Evidence file keys.
 *
 * The canonical key is the storage-relative path `<userId>/<documentId>/<file>`
 * — what `services/evidenceStorage` returns from upload and list, what the
 * saved document blob persists (`evidenceData.fileKey`), and what the PDF and
 * packet renderers resolve. The read/delete routes take it as one URL
 * segment (URL-encoded: `2%2F2%2Fmarriage_cert_1.png`).
 *
 * The bare file name is still accepted for older callers; it is resolved
 * inside the route's own `<userId>/<documentId>` sandbox either way, so the
 * two forms address exactly the same file and nothing else.
 */

export const EVIDENCE_FILENAME_ALLOWED = /^[A-Za-z0-9._\- ()]+$/;

/**
 * Validate a single file-name segment. Rejects separators, traversal hops,
 * control chars, and anything outside the allow-list.
 */
export function validateEvidenceFileName(value: string, label = 'file key'): string {
  if (!value || value === '.' || value === '..') {
    throw new ValidationError(`Invalid ${label}`);
  }
  if (
    value.includes('..') ||
    value.includes('/') ||
    value.includes('\\') ||
    value.includes('\0')
  ) {
    throw new ValidationError(`Invalid ${label}: path traversal attempt`);
  }
  // path.basename collapses any sneaky leading `./` or trailing slashes.
  if (path.basename(value) !== value) {
    throw new ValidationError(`Invalid ${label}`);
  }
  if (!EVIDENCE_FILENAME_ALLOWED.test(value)) {
    throw new ValidationError(`Invalid ${label} format`);
  }
  return value;
}

export interface ResolvedEvidenceKey {
  /** The bare file name inside the user/document directory. */
  fileName: string;
  /** The canonical storage key, `<userId>/<documentId>/<fileName>`. */
  storageKey: string;
}

/**
 * Resolve a `fileKey` URL parameter (canonical key or bare file name) to the
 * storage key inside the authenticated user's document sandbox. A canonical
 * key naming any other user or document is refused, never re-rooted.
 */
export function resolveEvidenceKey(
  raw: string,
  userId: number,
  documentId: number,
): ResolvedEvidenceKey {
  let value = typeof raw === 'string' ? raw : '';
  // The router may hand the segment over still percent-encoded. File names
  // can never contain '%' (allow-list), so one decode is unambiguous.
  if (value.includes('%')) {
    try {
      value = decodeURIComponent(value);
    } catch {
      throw new ValidationError('Invalid file key');
    }
  }
  if (value.includes('\\') || value.includes('\0')) {
    throw new ValidationError('Invalid file key: path traversal attempt');
  }

  let fileName: string;
  const parts = value.split('/');
  if (parts.length === 1) {
    fileName = validateEvidenceFileName(value);
  } else if (parts.length === 3) {
    const [owner, doc, name] = parts;
    if (owner !== String(userId) || doc !== String(documentId)) {
      throw new ValidationError('File key does not belong to this document');
    }
    fileName = validateEvidenceFileName(name);
  } else {
    throw new ValidationError('Invalid file key: path traversal attempt');
  }

  return {
    fileName,
    storageKey: path.posix.join(String(userId), String(documentId), fileName),
  };
}
