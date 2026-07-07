'use client';

import { useRef, useState, useTransition } from 'react';
import { createApiKey, createSandboxKey, revokeApiKey, rotateApiKey } from './actions';
import type { Database } from '@/types/database';

type ApiKey = Database['public']['Tables']['api_keys']['Row'];
type ApiKeyExt = ApiKey & { environment?: string | null; scopes?: string[] | null };

interface ApiKeyClientProps {
  keys: ApiKeyExt[];
}

// ── Key reveal banner ──────────────────────────────────────────────────────

function KeyReveal({ fullKey, onDismiss }: { fullKey: string; onDismiss: () => void }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(fullKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div style={{
      border: '1px solid var(--green)',
      borderRadius: 'var(--r-md)',
      background: 'var(--green-paper)',
      padding: '20px',
      marginBottom: '20px',
    }}>
      <div style={{
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        gap: '12px', marginBottom: '12px',
      }}>
        <div>
          <div style={{
            fontFamily: 'var(--ff-mono)', fontSize: '10px',
            letterSpacing: '0.1em', textTransform: 'uppercase',
            color: 'var(--green-deep)', marginBottom: '4px',
          }}>
            ● NEW API KEY — COPY NOW · SHOWN ONCE
          </div>
          <div style={{ fontSize: '13px', color: 'var(--ink-2)' }}>
            Store this key securely. It will not be shown again.
          </div>
        </div>
      </div>

      <div style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        padding: '12px 14px',
        background: 'var(--card)',
        borderRadius: 'var(--r-sm)',
        border: '1px solid var(--paper-edge)',
        marginBottom: '14px',
      }}>
        <code style={{
          fontFamily: 'var(--ff-mono)', fontSize: '13px',
          color: 'var(--ink)', flex: 1,
          wordBreak: 'break-all', lineHeight: 1.5,
        }}>
          {fullKey}
        </code>
        <button
          onClick={copy}
          style={{
            padding: '6px 12px', borderRadius: 'var(--r-sm)',
            background: copied ? 'var(--green)' : 'var(--paper-warm)',
            color: copied ? 'var(--paper)' : 'var(--ink-2)',
            border: '1px solid var(--paper-edge)',
            fontFamily: 'var(--ff-mono)', fontSize: '11px',
            cursor: 'pointer', flexShrink: 0,
            transition: 'background 0.2s, color 0.2s',
          }}
        >
          {copied ? 'COPIED ✓' : 'COPY'}
        </button>
      </div>

      <button
        onClick={onDismiss}
        style={{
          width: '100%', padding: '9px',
          background: 'var(--green)', color: 'var(--paper)',
          border: 'none', borderRadius: 'var(--r-sm)',
          fontFamily: 'var(--ff-body)', fontWeight: 500, fontSize: '13px',
          cursor: 'pointer',
        }}
      >
        I&apos;ve saved the key — dismiss
      </button>
    </div>
  );
}

// ── Sandbox key button ─────────────────────────────────────────────────────

function SandboxKeyButton({ onCreated }: { onCreated: (key: string) => void }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState('');

  function generate() {
    setError('');
    startTransition(async () => {
      const result = await createSandboxKey();
      if (!result.ok) { setError(result.error); return; }
      if (result.key) onCreated(result.key);
    });
  }

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', gap: '6px' }}>
      <button
        onClick={generate}
        disabled={pending}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: '6px',
          padding: '8px 14px', borderRadius: 'var(--r-sm)',
          background: pending ? 'var(--paper-warm)' : 'var(--amber-soft, #FFF3CD)',
          color: '#7A5C00',
          border: '1px solid #E8C84A',
          fontFamily: 'var(--ff-body)', fontWeight: 500, fontSize: '13px',
          cursor: pending ? 'not-allowed' : 'pointer',
          transition: 'background 0.15s',
        }}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" style={{
          width: '14px', height: '14px',
          stroke: 'currentColor', fill: 'none',
          strokeWidth: '2', strokeLinecap: 'round', strokeLinejoin: 'round',
        }}>
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
        {pending ? 'Generating…' : 'Generate sandbox key'}
      </button>
      {error && (
        <span style={{
          fontFamily: 'var(--ff-mono)', fontSize: '11px', color: 'var(--red)',
        }}>
          {error}
        </span>
      )}
    </div>
  );
}

// ── Create form ────────────────────────────────────────────────────────────

function CreateForm({ onCreated }: { onCreated: (key: string) => void }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  function submit(formData: FormData) {
    setError('');
    startTransition(async () => {
      const result = await createApiKey(formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      formRef.current?.reset();
      setOpen(false);
      if (result.key) onCreated(result.key);
    });
  }

  return (
    <div>
      {!open ? (
        <button className="btn-primary" onClick={() => setOpen(true)}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 5v14" /><path d="M5 12h14" />
          </svg>
          Create API key
        </button>
      ) : (
        <div style={{
          background: 'var(--card)', border: '1px solid var(--hairline)',
          borderRadius: 'var(--r-md)', padding: '20px', marginBottom: '20px',
        }}>
          <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '14px' }}>
            New API key
          </div>
          <form ref={formRef} action={submit}>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}>
                <label
                  htmlFor="key-name"
                  style={{
                    display: 'block', marginBottom: '6px',
                    fontFamily: 'var(--ff-mono)', fontSize: '10px',
                    letterSpacing: '0.06em', textTransform: 'uppercase',
                    color: 'var(--ink-3)',
                  }}
                >
                  Key name
                </label>
                <input
                  id="key-name"
                  name="name"
                  type="text"
                  placeholder="e.g. Production agent SDK"
                  required
                  minLength={2}
                  maxLength={64}
                  style={{
                    width: '100%', padding: '9px 12px',
                    background: 'var(--paper-warm)',
                    border: '1px solid transparent',
                    borderRadius: 'var(--r-sm)',
                    fontFamily: 'var(--ff-body)', fontSize: '13px',
                    color: 'var(--ink)', outline: 'none',
                    boxSizing: 'border-box',
                  }}
                  onFocus={(e) => { e.currentTarget.style.background = 'var(--card)'; e.currentTarget.style.borderColor = 'var(--green)'; }}
                  onBlur={(e) => { e.currentTarget.style.background = 'var(--paper-warm)'; e.currentTarget.style.borderColor = 'transparent'; }}
                />
              </div>
              <button
                type="submit"
                disabled={pending}
                className="btn-primary"
                style={{ whiteSpace: 'nowrap' }}
              >
                {pending ? 'Creating…' : 'Create key'}
              </button>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => { setOpen(false); setError(''); }}
              >
                Cancel
              </button>
            </div>
            {error && (
              <div style={{
                marginTop: '10px', padding: '8px 12px',
                background: 'var(--red-soft)', color: '#7C201D',
                borderRadius: 'var(--r-sm)', fontFamily: 'var(--ff-mono)', fontSize: '12px',
              }}>
                {error}
              </div>
            )}
          </form>
        </div>
      )}
    </div>
  );
}

// ── Key row actions ────────────────────────────────────────────────────────

function KeyActions({
  keyId,
  keyName,
  onRotated,
}: {
  keyId: string;
  keyName: string;
  onRotated: (key: string) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [action, setAction] = useState<'idle' | 'revoking' | 'rotating'>('idle');
  const [error, setError] = useState('');
  const [confirmRevoke, setConfirmRevoke] = useState(false);

  function revoke() {
    setError('');
    setAction('revoking');
    startTransition(async () => {
      const result = await revokeApiKey(keyId);
      if (!result.ok) { setError(result.error); setAction('idle'); }
      // On success, revalidatePath refreshes the server component list
    });
  }

  function rotate() {
    setError('');
    setAction('rotating');
    startTransition(async () => {
      const result = await rotateApiKey(keyId);
      setAction('idle');
      if (!result.ok) { setError(result.error); return; }
      if (result.key) onRotated(result.key);
    });
  }

  if (confirmRevoke) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontFamily: 'var(--ff-mono)', fontSize: '11px', color: 'var(--red)' }}>
          Revoke &quot;{keyName}&quot;?
        </span>
        <button
          onClick={revoke}
          disabled={pending}
          style={{
            padding: '4px 10px', borderRadius: 'var(--r-sm)',
            background: 'var(--red)', color: 'var(--paper)',
            border: 'none', fontFamily: 'var(--ff-mono)', fontSize: '11px',
            cursor: pending ? 'not-allowed' : 'pointer', opacity: pending ? 0.6 : 1,
          }}
        >
          {pending && action === 'revoking' ? 'Revoking…' : 'Confirm revoke'}
        </button>
        <button
          onClick={() => setConfirmRevoke(false)}
          style={{
            padding: '4px 10px', borderRadius: 'var(--r-sm)',
            background: 'transparent', color: 'var(--ink-2)',
            border: '1px solid var(--hairline-2)',
            fontFamily: 'var(--ff-mono)', fontSize: '11px', cursor: 'pointer',
          }}
        >
          Cancel
        </button>
        {error && (
          <span style={{ fontFamily: 'var(--ff-mono)', fontSize: '11px', color: 'var(--red)' }}>
            {error}
          </span>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <button
        onClick={rotate}
        disabled={pending}
        className="btn-ghost"
        style={{ fontSize: '12px', padding: '5px 10px' }}
      >
        {pending && action === 'rotating' ? 'Rotating…' : 'Rotate'}
      </button>
      <button
        onClick={() => setConfirmRevoke(true)}
        disabled={pending}
        className="btn-danger"
        style={{ fontSize: '12px', padding: '5px 10px' }}
      >
        Revoke
      </button>
      {error && (
        <span style={{ fontFamily: 'var(--ff-mono)', fontSize: '11px', color: 'var(--red)' }}>
          {error}
        </span>
      )}
    </div>
  );
}

// ── Main client component ──────────────────────────────────────────────────

function relativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function ApiKeyClient({ keys }: ApiKeyClientProps) {
  const [revealedKey, setRevealedKey] = useState<string | null>(null);

  return (
    <div>
      {/* Show-once reveal banner */}
      {revealedKey && (
        <KeyReveal
          fullKey={revealedKey}
          onDismiss={() => setRevealedKey(null)}
        />
      )}

      {/* Create form + sandbox shortcut */}
      <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <CreateForm onCreated={(key) => setRevealedKey(key)} />
        <SandboxKeyButton onCreated={(key) => setRevealedKey(key)} />
      </div>

      {/* Keys table */}
      {keys.length === 0 ? (
        <div style={{
          background: 'var(--card)', border: '1px solid var(--hairline)',
          borderRadius: 'var(--r-md)', overflow: 'hidden', marginTop: '20px',
        }}>
          <div style={{
            padding: '12px 16px', borderBottom: '1px solid var(--paper-edge)',
            fontFamily: 'var(--ff-mono)', fontSize: '11px', color: 'var(--ink-3)',
          }}>
            Create a key above — it will appear here. Shown once at creation, only the prefix is stored.
          </div>
          {/* Skeleton rows */}
          <div style={{ opacity: 0.4, pointerEvents: 'none' }}>
            {[80, 100, 75].map((w, i) => (
              <div key={i} className="skel-row">
                <div className="skel skel-line-lg" style={{ width: w }} />
                <div className="skel skel-badge" style={{ width: 90 }} />
                <div className="skel skel-line-sm" style={{ width: 70 }} />
                <div className="skel skel-pill" style={{ width: 50 }} />
                <div className="skel skel-badge" style={{ width: 120 }} />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div style={{
          background: 'var(--card)', border: '1px solid var(--hairline)',
          borderRadius: 'var(--r-md)', overflow: 'hidden', marginTop: '20px',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: 'var(--paper)', borderBottom: '1px solid var(--paper-edge)' }}>
                {['Name', 'Prefix', 'Created', 'Status', 'Actions'].map((h) => (
                  <th key={h} style={{
                    padding: '10px 16px', textAlign: 'left',
                    fontFamily: 'var(--ff-mono)', fontSize: '10px',
                    letterSpacing: '0.08em', textTransform: 'uppercase',
                    color: 'var(--ink-3)', fontWeight: 500,
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {keys.map((k) => {
                const isRevoked = !!k.revoked_at;
                return (
                  <tr
                    key={k.id}
                    style={{
                      borderBottom: '1px solid var(--paper-edge)',
                      opacity: isRevoked ? 0.55 : 1,
                    }}
                  >
                    <td style={{ padding: '12px 16px', fontWeight: 500 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {k.name}
                        {k.environment === 'sandbox' && (
                          <span style={{
                            fontFamily: 'var(--ff-mono)', fontSize: '9px',
                            letterSpacing: '0.08em', textTransform: 'uppercase',
                            padding: '2px 6px', borderRadius: '3px',
                            background: '#FFF3CD', color: '#7A5C00',
                            border: '1px solid #E8C84A', fontWeight: 600,
                          }}>
                            sandbox
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <code style={{
                        fontFamily: 'var(--ff-mono)', fontSize: '12px',
                        background: 'var(--paper)', padding: '2px 8px',
                        borderRadius: '4px', color: 'var(--ink)',
                      }}>
                        {k.key_prefix}…
                      </code>
                    </td>
                    <td style={{
                      padding: '12px 16px',
                      fontFamily: 'var(--ff-mono)', fontSize: '11px',
                      color: 'var(--ink-3)',
                    }}>
                      {relativeTime(k.created_at)}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {isRevoked ? (
                        <span className="pill-mini fail">
                          revoked {relativeTime(k.revoked_at!)}
                        </span>
                      ) : (
                        <span className="pill-mini">active</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {isRevoked ? (
                        <span style={{
                          fontFamily: 'var(--ff-mono)', fontSize: '11px',
                          color: 'var(--ink-3)',
                        }}>
                          —
                        </span>
                      ) : (
                        <KeyActions
                          keyId={k.id}
                          keyName={k.name}
                          onRotated={(key) => setRevealedKey(key)}
                        />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Security callout */}
      <div style={{
        marginTop: '20px', padding: '14px 18px',
        background: 'var(--paper-warm)', borderRadius: 'var(--r-md)',
        border: '1px dashed var(--paper-edge)',
        display: 'flex', gap: '12px', alignItems: 'flex-start',
      }}>
        <svg viewBox="0 0 24 24" style={{
          width: '16px', height: '16px', flexShrink: 0, marginTop: '2px',
          stroke: 'var(--ink-3)', fill: 'none',
          strokeWidth: '1.7', strokeLinecap: 'round', strokeLinejoin: 'round',
        }} aria-hidden="true">
          <path d="M12 2 4 5v6c0 5 3.5 8.5 8 10 4.5-1.5 8-5 8-10V5l-8-3Z" />
        </svg>
        <div style={{ fontFamily: 'var(--ff-mono)', fontSize: '11px', color: 'var(--ink-3)', lineHeight: 1.6 }}>
          API keys are hashed (SHA-256) before storage — plaintext is never persisted.
          Only the prefix is shown after creation. Use{' '}
          <code style={{ background: 'var(--paper-edge)', padding: '1px 4px', borderRadius: '3px' }}>
            Authorization: Bearer kak_live_…
          </code>{' '}
          on all <code style={{ background: 'var(--paper-edge)', padding: '1px 4px', borderRadius: '3px' }}>
            /api/v1/*
          </code> requests.
          Rotate keys at least every 90 days.
        </div>
      </div>
    </div>
  );
}
