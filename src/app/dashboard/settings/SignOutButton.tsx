'use client';

import { useRouter } from 'next/navigation';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';

export function SignOutButton() {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createBrowserSupabaseClient();
    await supabase.auth.signOut();
    router.push('/');
  }

  return (
    <button
      onClick={handleSignOut}
      style={{
        flexShrink: 0,
        padding: '8px 16px',
        background: 'var(--card)',
        border: '1px solid var(--hairline-2)',
        borderRadius: 'var(--r-sm)',
        cursor: 'pointer',
        fontFamily: 'var(--ff-mono)',
        fontSize: '12px',
        color: 'var(--ink-2)',
        letterSpacing: '0.02em',
      }}
    >
      Sign out →
    </button>
  );
}
