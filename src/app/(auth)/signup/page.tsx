'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';

export default function SignupPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      setLoading(false);
      return;
    }

    // Server-side business email check before hitting Supabase
    const check = await fetch('/api/auth/validate-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    if (!check.ok) {
      const { error: emailError } = await check.json() as { error: string };
      setError(emailError ?? 'Email not accepted.');
      setLoading(false);
      return;
    }

    const supabase = createBrowserSupabaseClient();
    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}/api/auth/callback`,
      },
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    // If email confirmation is disabled, user is immediately signed in
    // Send to plan selection — not dashboard — so they choose a plan + Stripe trial
    if (data.session) {
      router.push('/signup/plan');
      router.refresh();
      return;
    }

    // Email confirmation required
    setSuccess('Check your email — we sent you a confirmation link.');
    setLoading(false);
  }

  return (
    <div className="auth-root">
      <div className="auth-brand">
        <Link href="/">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Kakunin" />
        </Link>
      </div>

      <div className="auth-card">
        <h1 className="auth-title">Create account</h1>
        <p className="auth-sub">Start issuing X.509 identities to your AI agents.</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-field">
            <label className="auth-label" htmlFor="fullName">Full name</label>
            <input
              id="fullName"
              className="auth-input"
              type="text"
              autoComplete="name"
              required
              placeholder="Ada Lovelace"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>

          <div className="auth-field">
            <label className="auth-label" htmlFor="email">Work email</label>
            <input
              id="email"
              className="auth-input"
              type="email"
              autoComplete="email"
              required
              placeholder="ada@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="auth-field">
            <label className="auth-label" htmlFor="password">Password</label>
            <input
              id="password"
              className="auth-input"
              type="password"
              autoComplete="new-password"
              required
              placeholder="Min. 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && <div className="auth-error">{error}</div>}
          {success && <div className="auth-success">{success}</div>}

          {!success && (
            <button className="auth-btn auth-btn--primary" type="submit" disabled={loading}>
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          )}
        </form>

        <div className="auth-links">
          <span>
            Already have an account?{' '}
            <Link href="/login">Sign in</Link>
          </span>
        </div>
      </div>

      <div className="auth-stamp">確認 · KAKUNIN.AI · TRUST INFRASTRUCTURE</div>
    </div>
  );
}
