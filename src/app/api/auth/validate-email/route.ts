import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { checkBusinessEmail, businessEmailErrorMessage } from '@/lib/email/business-email';

const bodySchema = z.object({
  email: z.string().email(),
});

/**
 * POST /api/auth/validate-email
 *
 * Server-side business email check called before supabase.auth.signUp().
 * Public endpoint — no auth required. Rate limiting handled by middleware
 * if this route is added to the matcher; currently relies on Vercel's
 * edge-level request limits for public endpoints.
 */
export async function POST(req: NextRequest) {
  const body = bodySchema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ error: 'Invalid email address.' }, { status: 400 });
  }

  const result = checkBusinessEmail(body.data.email);
  if (!result.allowed) {
    return NextResponse.json(
      { error: businessEmailErrorMessage(result.reason) },
      { status: 422 }
    );
  }

  return NextResponse.json({ ok: true });
}
