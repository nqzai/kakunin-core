import { type NextRequest, type NextResponse } from 'next/server';
import type { ZodType, output as ZodOutput } from 'zod';
import { verifyQStashBody } from '@/lib/queue/verify-qstash';
import { badRequest, unauthorized } from './responses';

type ParseResult<T> =
  | { ok: true; data: T }
  | { ok: false; response: NextResponse<{ error: string }> };

/**
 * Parse and validate a JSON request body against a Zod schema.
 * Returns the validated data or a 400 error response.
 */
export async function parseBody<T extends ZodType>(
  req: NextRequest,
  schema: T,
): Promise<ParseResult<ZodOutput<T>>> {
  const result = schema.safeParse(await req.json());
  if (!result.success) {
    return { ok: false, response: badRequest(result.error.message) };
  }
  return { ok: true, data: result.data as ZodOutput<T> };
}

/**
 * Verify a QStash signature, then parse and validate the body against a Zod
 * schema. Combines the two-step guard (verify + parse) that is repeated
 * across every internal worker route.
 */
export async function parseQStashBody<T extends ZodType>(
  req: NextRequest,
  schema: T,
): Promise<ParseResult<ZodOutput<T>>> {
  const raw = await verifyQStashBody(req);
  if (!raw) {
    return { ok: false, response: unauthorized() };
  }
  const result = schema.safeParse(JSON.parse(raw));
  if (!result.success) {
    return { ok: false, response: badRequest(result.error.message) };
  }
  return { ok: true, data: result.data as ZodOutput<T> };
}
