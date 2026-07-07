'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  agentId: string;
}

/**
 * Calls POST /api/v1/agents/:id/certify, then refreshes the page to show the
 * newly issued certificate. Replaces the broken Link → /dashboard/agents/new.
 */
export function CertifyButton({ agentId }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCertify() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/dashboard/agents/${agentId}/certify`, {
        method: 'POST',
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError((body as { error?: string }).error ?? `Error ${res.status}`);
        return;
      }

      // Refresh server component to show new cert
      router.refresh();
    } catch {
      setError('Network error — try again');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
      <button
        className="btn-primary"
        onClick={handleCertify}
        disabled={loading}
      >
        {loading ? 'Issuing…' : 'Issue passport'}
      </button>
      {error && (
        <p style={{ margin: 0, color: 'var(--red)', fontFamily: 'var(--ff-mono)', fontSize: '11px' }}>
          {error}
        </p>
      )}
    </div>
  );
}
