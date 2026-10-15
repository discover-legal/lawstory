/**
 * Turn a failed `/api/documents/generate` response into a message the person
 * can act on. The route answers 422 `MissingRequiredFields` with the list of
 * fields the draft still needs; that list is the useful part, so it is named
 * explicitly instead of collapsing to a generic "failed to download".
 */

type GenerateErrorBody = {
  error?: unknown;
  errorType?: unknown;
  missingFields?: unknown;
};

async function readBody(response: Response): Promise<GenerateErrorBody | null> {
  let text = '';
  try {
    text = await response.text();
  } catch {
    return null;
  }
  if (!text) return null;
  try {
    const parsed = JSON.parse(text) as unknown;
    return parsed && typeof parsed === 'object' ? (parsed as GenerateErrorBody) : null;
  } catch {
    return null;
  }
}

export function describeGenerateError(
  status: number,
  body: GenerateErrorBody | null,
  documentLabel = 'document',
): string {
  const missing = Array.isArray(body?.missingFields)
    ? (body!.missingFields as unknown[]).filter((f): f is string => typeof f === 'string' && f.trim() !== '')
    : [];
  if (missing.length > 0) {
    return `Your ${documentLabel} draft can't be created yet. It still needs: ${missing.join(', ')}. Tell me these in the chat, then download again.`;
  }
  if (typeof body?.error === 'string' && body.error.trim()) {
    return `Your ${documentLabel} draft could not be created: ${body.error.trim()}`;
  }
  return `Your ${documentLabel} draft could not be created (server error ${status}). Please try again in a moment.`;
}

/** Read the response body (JSON or not) and describe the failure. */
export async function describeGenerateFailure(
  response: Response,
  documentLabel?: string,
): Promise<string> {
  return describeGenerateError(response.status, await readBody(response), documentLabel);
}
