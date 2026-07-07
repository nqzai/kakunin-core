'use client';

import { useState } from 'react';
import { useFormStatus } from 'react-dom';
import Link from 'next/link';
import { registerAgent } from './actions';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="btn-primary"
      style={{ opacity: pending ? 0.6 : 1 }}
    >
      {pending ? 'Registering…' : 'Register agent →'}
    </button>
  );
}

export default function NewAgentPage() {
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setError(null);
    const result = await registerAgent(formData);
    if (result?.error) setError(result.error);
  }

  return (
    <main className="dash-inner" style={{ maxWidth: '640px' }}>
      <div className="dash-inner-head">
        <div>
          <h1 className="dash-h1">Register agent</h1>
          <p className="dash-sub">Provision an AI agent and issue its X.509 identity certificate</p>
        </div>
        <Link href="/dashboard/agents" style={{
          fontFamily: 'var(--ff-mono)', fontSize: '12px', color: 'var(--ink-3)',
          textDecoration: 'none', padding: '8px 12px',
          border: '1px solid var(--hairline)', borderRadius: 'var(--r-sm)',
        }}>
          ← Back
        </Link>
      </div>

      {error && (
        <div style={{
          marginBottom: '20px', padding: '14px 18px',
          background: 'var(--red-soft)', border: '1px solid var(--red)',
          borderRadius: 'var(--r-md)', fontFamily: 'var(--ff-mono)',
          fontSize: '12px', color: '#7C201D',
        }}>
          {error}
        </div>
      )}

      <form action={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Name */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontFamily: 'var(--ff-mono)', fontSize: '11px', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>
            Agent name <span style={{ color: 'var(--red)' }}>*</span>
          </label>
          <input
            name="name"
            required
            placeholder="e.g. trading-sentinel-v2"
            style={{
              padding: '10px 14px', borderRadius: 'var(--r-sm)',
              border: '1px solid var(--hairline-2)',
              background: 'var(--card)', color: 'var(--ink)',
              fontFamily: 'var(--ff-mono)', fontSize: '13px',
              outline: 'none', width: '100%',
            }}
          />
          <span style={{ fontFamily: 'var(--ff-mono)', fontSize: '11px', color: 'var(--ink-3)' }}>
            Human-readable identifier for this agent.
          </span>
        </div>

        {/* Model hash */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontFamily: 'var(--ff-mono)', fontSize: '11px', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>
            Model hash <span style={{ color: 'var(--red)' }}>*</span>
          </label>
          <input
            name="model_hash"
            required
            placeholder="sha256:abc123… or model checkpoint hash"
            style={{
              padding: '10px 14px', borderRadius: 'var(--r-sm)',
              border: '1px solid var(--hairline-2)',
              background: 'var(--card)', color: 'var(--ink)',
              fontFamily: 'var(--ff-mono)', fontSize: '12px',
              outline: 'none', width: '100%',
            }}
          />
          <span style={{ fontFamily: 'var(--ff-mono)', fontSize: '11px', color: 'var(--ink-3)' }}>
            Cryptographic fingerprint of the model weights. Locked into the X.509 cert.
          </span>
        </div>

        {/* Model + Version row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontFamily: 'var(--ff-mono)', fontSize: '11px', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>
              Model
            </label>
            <input
              name="model"
              placeholder="e.g. gpt-4o, claude-3-5-sonnet"
              style={{
                padding: '10px 14px', borderRadius: 'var(--r-sm)',
                border: '1px solid var(--hairline-2)',
                background: 'var(--card)', color: 'var(--ink)',
                fontFamily: 'var(--ff-mono)', fontSize: '13px',
                outline: 'none', width: '100%',
              }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontFamily: 'var(--ff-mono)', fontSize: '11px', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>
              Version
            </label>
            <input
              name="version"
              placeholder="e.g. 1.0.0"
              style={{
                padding: '10px 14px', borderRadius: 'var(--r-sm)',
                border: '1px solid var(--hairline-2)',
                background: 'var(--card)', color: 'var(--ink)',
                fontFamily: 'var(--ff-mono)', fontSize: '13px',
                outline: 'none', width: '100%',
              }}
            />
          </div>
        </div>

        {/* Description */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontFamily: 'var(--ff-mono)', fontSize: '11px', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>
            Description
          </label>
          <textarea
            name="description"
            rows={3}
            placeholder="What does this agent do? (optional)"
            style={{
              padding: '10px 14px', borderRadius: 'var(--r-sm)',
              border: '1px solid var(--hairline-2)',
              background: 'var(--card)', color: 'var(--ink)',
              fontFamily: 'var(--ff-mono)', fontSize: '13px',
              outline: 'none', width: '100%', resize: 'vertical',
            }}
          />
        </div>

        {/* Info callout */}
        <div style={{
          padding: '14px 16px',
          background: 'var(--paper-warm)', border: '1px dashed var(--paper-edge)',
          borderRadius: 'var(--r-sm)',
          fontFamily: 'var(--ff-mono)', fontSize: '11px', color: 'var(--ink-3)', lineHeight: 1.6,
        }}>
          After registration, call <code style={{ background: 'var(--paper-edge)', padding: '1px 5px', borderRadius: '3px' }}>POST /v1/agents/:id/certify</code> with your API key to issue the X.509 certificate.
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <SubmitButton />
        </div>
      </form>
    </main>
  );
}
