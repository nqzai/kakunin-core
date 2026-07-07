'use client';

import { useState } from 'react';
import Link from 'next/link';
import { TIERS, TIER_ORDER } from '@/lib/stripe/plans';

/**
 * /signup/plan — Plan selection step after account creation.
 *
 * User arrives here after successful Supabase signup (redirect from /signup).
 * Picks Starter or Pro → POST /api/billing/checkout → Stripe Checkout (hosted).
 * Stripe redirects back to /dashboard/get-started on success.
 *
 * First month free on both plans (trial_period_days: 30 on subscription).
 */
export default function PlanPage() {
  const [selected, setSelected] = useState<'starter' | 'pro'>('starter');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleContinue() {
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: selected }),
      });

      const json = await res.json() as { url?: string; error?: string };

      if (!res.ok || !json.url) {
        setError(json.error ?? 'Failed to create checkout session.');
        setLoading(false);
        return;
      }

      // Redirect to Stripe Checkout
      window.location.href = json.url;
    } catch {
      setError('Something went wrong. Please try again.');
      setLoading(false);
    }
  }

  return (
    <div className="auth-root">
      <div className="auth-brand">
        <Link href="/">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Kakunin" />
        </Link>
      </div>

      <div className="plan-card">
        <h1 className="auth-title">Choose your plan</h1>
        <p className="auth-sub">
          30-day free trial on both plans. Card charged on day 31 — cancel anytime before.
        </p>

        <div className="plan-grid">
          {TIER_ORDER.map((key) => {
            const tier = TIERS[key];
            const isSelected = selected === key;
            return (
              <button
                key={key}
                type="button"
                className={`plan-option${isSelected ? ' plan-option--selected' : ''}${tier.highlighted ? ' plan-option--featured' : ''}`}
                onClick={() => setSelected(key)}
              >
                {tier.highlighted && (
                  <span className="plan-badge">Most popular</span>
                )}
                <div className="plan-option-name">{tier.name}</div>
                <div className="plan-option-price">
                  <span className="plan-option-amount">{tier.priceLabel}</span>
                  <span className="plan-option-unit">/agent/mo</span>
                </div>
                <div className="plan-option-min">
                  Min {tier.minAgents} agents &middot; from {tier.priceLabel === '$39' ? '$195' : '$1,980'}/mo
                </div>
                <ul className="plan-option-features">
                  {tier.features.slice(0, 4).map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
                <div className={`plan-radio${isSelected ? ' plan-radio--on' : ''}`} aria-hidden="true" />
              </button>
            );
          })}
        </div>

        <div className="plan-trial-note">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <circle cx="7" cy="7" r="6.5" stroke="#2B934F" />
            <path d="M4 7l2 2 4-4" stroke="#2B934F" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          30-day free trial &mdash; no charge until day 31
        </div>

        {error && <div className="auth-error" style={{ marginBottom: 16 }}>{error}</div>}

        <button
          className="auth-btn auth-btn--primary"
          onClick={handleContinue}
          disabled={loading}
        >
          {loading ? 'Redirecting to checkout…' : `Continue with ${TIERS[selected].name} →`}
        </button>

        <div className="auth-links">
          <span>
            Need more than 20 agents?{' '}
            <a href="mailto:ai@kakunin.ai?subject=Enterprise%20enquiry">Talk to us</a>
          </span>
        </div>
      </div>

      <div className="auth-stamp">確認 · KAKUNIN.AI · TRUST INFRASTRUCTURE</div>
    </div>
  );
}
