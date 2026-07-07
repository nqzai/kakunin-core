'use client';

import { useState } from 'react';

interface ConsentState {
  analytics: boolean;
  marketing: boolean;
  saved: boolean;
}

const STORAGE_KEY = 'kakunin_consent';

function loadConsent(): ConsentState {
  if (typeof window === 'undefined') return { analytics: false, marketing: false, saved: false };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as ConsentState;
  } catch {
    // ignore
  }
  return { analytics: false, marketing: false, saved: false };
}

function saveConsent(state: ConsentState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

function notifyConsentChanged() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event('kakunin-consent-changed'));
}

/**
 * ConsentButton — "Your Privacy Choices" trigger + GDPR consent modal.
 * Powered by c15t.com design principles; self-hosted, no external dependency.
 * Rendered client-side so state + onClick work in server-component pages.
 */
export function ConsentButton() {
  const [open, setOpen] = useState(false);
  // Lazy initializer: reads localStorage once on mount, avoids setState-in-effect
  const [consent, setConsent] = useState<ConsentState>(() => loadConsent());

  function handleSave() {
    const updated = { ...consent, saved: true };
    saveConsent(updated);
    setConsent(updated);
    notifyConsentChanged();
    setOpen(false);
  }

  function handleAcceptAll() {
    const updated = { analytics: true, marketing: true, saved: true };
    saveConsent(updated);
    setConsent(updated);
    notifyConsentChanged();
    setOpen(false);
  }

  return (
    <>
      {/* Trigger button */}
      <button
        type="button"
        className="privacy-choices-btn"
        onClick={() => setOpen(true)}
        aria-label="Open privacy preferences"
      >
        <svg aria-hidden="true" viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="8" cy="8" r="6.5" />
          <path d="M5.5 8.5 C5.5 7 6.5 5.5 8 5.5 C9.5 5.5 10.5 7 10.5 8.5" />
          <line x1="8" y1="10" x2="8" y2="11.5" />
          <circle cx="8" cy="10" r="0.6" fill="currentColor" />
        </svg>
        Your Privacy Choices
      </button>

      {/* Modal overlay */}
      {open && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(20,24,27,0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '16px',
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div style={{
            background: '#FFFFFF',
            borderRadius: '16px',
            maxWidth: '480px',
            width: '100%',
            padding: '32px',
            boxShadow: '0 24px 60px -12px rgba(20,24,27,0.3)',
          }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
              <div>
                <div style={{
                  fontFamily: 'var(--ff-mono, monospace)', fontSize: '10px',
                  letterSpacing: '0.1em', textTransform: 'uppercase',
                  color: 'var(--green, #2B934F)', marginBottom: '6px',
                }}>
                  Privacy Preferences
                </div>
                <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#14181B', lineHeight: 1.2 }}>
                  Your Privacy Choices
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: '#8A8C84', padding: '4px', borderRadius: '6px',
                  lineHeight: 0,
                }}
              >
                <svg viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M5 5l10 10M15 5L5 15" />
                </svg>
              </button>
            </div>

            <p style={{ fontSize: '13px', color: '#4A4F52', lineHeight: 1.6, margin: '0 0 24px' }}>
              We use cookies and similar technologies to improve your experience, analyse traffic,
              and support our compliance infrastructure. You can choose which categories to allow.
              Strictly necessary cookies cannot be disabled as the site requires them to function.
            </p>

            {/* Consent rows */}
            {[
              {
                key: 'required' as const,
                label: 'Strictly Necessary',
                desc: 'Authentication, security, fraud prevention. Always active.',
                locked: true,
                value: true,
              },
              {
                key: 'analytics' as const,
                label: 'Analytics',
                desc: 'Helps us understand how visitors use the site so we can improve it.',
                locked: false,
                value: consent.analytics,
              },
              {
                key: 'marketing' as const,
                label: 'Marketing',
                desc: 'Used to measure and optimise the performance of our campaigns.',
                locked: false,
                value: consent.marketing,
              },
            ].map(({ key, label, desc, locked, value }) => (
              <div
                key={key}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                  padding: '16px 0',
                  borderTop: '1px solid rgba(20,24,27,0.08)',
                  gap: '16px',
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#14181B', marginBottom: '2px' }}>
                    {label}
                    {locked && (
                      <span style={{
                        marginLeft: '8px', fontSize: '10px', fontFamily: 'var(--ff-mono, monospace)',
                        background: '#DDEEDF', color: '#2B934F',
                        padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase', letterSpacing: '0.06em',
                      }}>
                        Required
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '12px', color: '#8A8C84', lineHeight: 1.5 }}>{desc}</div>
                </div>
                {/* Toggle */}
                <button
                  type="button"
                  role="switch"
                  aria-checked={value}
                  disabled={locked}
                  onClick={() => {
                    if (locked) return;
                    setConsent(prev => ({ ...prev, [key]: !prev[key as keyof ConsentState] }));
                  }}
                  style={{
                    flexShrink: 0,
                    width: '44px', height: '24px',
                    borderRadius: '12px',
                    border: 'none',
                    background: value ? 'var(--green, #2B934F)' : '#D1D5DB',
                    cursor: locked ? 'default' : 'pointer',
                    position: 'relative',
                    transition: 'background .2s ease',
                    opacity: locked ? 0.6 : 1,
                  }}
                >
                  <span style={{
                    position: 'absolute',
                    top: '3px', left: value ? '23px' : '3px',
                    width: '18px', height: '18px',
                    borderRadius: '50%',
                    background: '#FFFFFF',
                    transition: 'left .2s ease',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                  }} />
                </button>
              </div>
            ))}

            {/* Actions */}
            <div style={{ display: 'flex', gap: '10px', marginTop: '24px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={handleAcceptAll}
                style={{
                  flex: 1, minWidth: '120px',
                  padding: '10px 16px',
                  background: 'var(--green, #2B934F)', color: '#FFFFFF',
                  border: 'none', borderRadius: '8px',
                  fontSize: '13px', fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'background .15s ease',
                }}
              >
                Accept all
              </button>
              <button
                type="button"
                onClick={handleSave}
                style={{
                  flex: 1, minWidth: '120px',
                  padding: '10px 16px',
                  background: 'transparent', color: '#14181B',
                  border: '1.5px solid rgba(20,24,27,0.16)', borderRadius: '8px',
                  fontSize: '13px', fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'border-color .15s ease',
                }}
              >
                Save preferences
              </button>
            </div>

            <p style={{ fontSize: '11px', color: '#8A8C84', marginTop: '16px', marginBottom: 0, lineHeight: 1.5 }}>
              Read our{' '}
              <a href="/privacy" style={{ color: 'var(--green, #2B934F)', textDecoration: 'none' }}>Privacy Policy</a>
              {' '}for details on how we use your data. You can change these preferences at any time.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
