import { redirect } from 'next/navigation';
import { resolveSessionTenantContext } from '@/lib/tenant/session';
import { confirmVercelInstall } from './actions';

export const dynamic = 'force-dynamic';

export default async function VercelConfirmPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const session = await resolveSessionTenantContext();

  if (!session?.user) {
    redirect(`/login?next=${encodeURIComponent(`/dashboard/integrations/vercel/confirm?token=${token ?? ''}`)}`);
  }

  if (!token) {
    return (
      <main className="dash-inner">
        <h1 className="dash-h1">Connect Vercel</h1>
        <p className="dash-sub">Missing confirmation token. Start the install again from the Vercel Marketplace.</p>
      </main>
    );
  }

  async function confirm() {
    'use server';
    await confirmVercelInstall(token!);
  }

  return (
    <main className="dash-inner">
      <h1 className="dash-h1">Connect Vercel integration</h1>
      <p className="dash-sub">
        Confirm to issue a Kakunin API key and inject it as <code>KAK_API_KEY</code> into the
        projects in this Vercel installation.
      </p>
      <form action={confirm}>
        <button type="submit" className="btn-primary">
          Confirm &amp; connect
        </button>
      </form>
    </main>
  );
}
