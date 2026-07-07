'use client';

import { useState } from 'react';

type Lang = 'curl' | 'ts' | 'python';

interface Step {
  id: number;
  title: string;
  description: string;
  done: boolean;
  href?: string;
  hrefLabel?: string;
  snippets: Record<Lang, string>;
}

interface Props {
  steps: Step[];
  checkoutSuccess: boolean;
  apiKeyPrefix: string | null;
}

const LANG_LABELS: Record<Lang, string> = {
  curl: 'cURL',
  ts: 'TypeScript',
  python: 'Python',
};

export function GetStartedClient({ steps, checkoutSuccess, apiKeyPrefix }: Props) {
  const [lang, setLang] = useState<Lang>('curl');
  const [copied, setCopied] = useState<number | null>(null);

  const completedCount = steps.filter((s) => s.done).length;
  const allDone = completedCount === steps.length;

  async function copy(text: string, stepId: number) {
    await navigator.clipboard.writeText(text);
    setCopied(stepId);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div>
      {/* Checkout success banner */}
      {checkoutSuccess && (
        <div style={{
          marginBottom: '24px', padding: '16px 20px',
          background: 'var(--green-paper)', border: '1px solid var(--green)',
          borderRadius: 'var(--r-md)', display: 'flex', gap: '12px', alignItems: 'center',
        }}>
          <svg viewBox="0 0 24 24" style={{ width: '18px', height: '18px', stroke: 'var(--green)', fill: 'none', strokeWidth: '2', strokeLinecap: 'round', strokeLinejoin: 'round', flexShrink: 0 }}>
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><path d="m9 11 3 3L22 4" />
          </svg>
          <div>
            <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--green-deep)', marginBottom: '2px' }}>
              Trial activated — 30 days free
            </div>
            <div style={{ fontSize: '12px', color: 'var(--green-deep)', opacity: 0.85 }}>
              5 agents included. Your card won&apos;t be charged until day 31.
            </div>
          </div>
        </div>
      )}

      {/* Progress bar */}
      <div style={{
        background: 'var(--card)', border: '1px solid var(--hairline)',
        borderRadius: 'var(--r-md)', padding: '20px 24px', marginBottom: '28px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div style={{ fontFamily: 'var(--ff-mono)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink-3)' }}>
            Setup progress
          </div>
          <div style={{ fontFamily: 'var(--ff-mono)', fontSize: '12px', color: allDone ? 'var(--green)' : 'var(--ink-2)' }}>
            {completedCount} / {steps.length} complete
          </div>
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          {steps.map((step) => (
            <div
              key={step.id}
              style={{
                flex: 1, height: '4px', borderRadius: '2px',
                background: step.done ? 'var(--green)' : 'var(--paper-warm)',
                transition: 'background 0.3s',
              }}
            />
          ))}
        </div>
        {allDone && (
          <p style={{ margin: '10px 0 0', fontSize: '12px', color: 'var(--green)', fontFamily: 'var(--ff-mono)' }}>
            All steps complete — your first agent is issuing X.509 certificates.
          </p>
        )}
      </div>

      {/* Language toggle */}
      <div style={{
        display: 'flex', gap: '4px', marginBottom: '20px',
        background: 'var(--paper-warm)', border: '1px solid var(--hairline)',
        borderRadius: 'var(--r-sm)', padding: '3px', width: 'fit-content',
      }}>
        {(Object.keys(LANG_LABELS) as Lang[]).map((l) => (
          <button
            key={l}
            onClick={() => setLang(l)}
            style={{
              padding: '5px 14px',
              background: lang === l ? 'var(--card)' : 'transparent',
              border: lang === l ? '1px solid var(--hairline)' : '1px solid transparent',
              borderRadius: 'var(--r-xs)',
              cursor: 'pointer',
              fontFamily: 'var(--ff-mono)',
              fontSize: '11px',
              color: lang === l ? 'var(--ink)' : 'var(--ink-3)',
              fontWeight: lang === l ? 600 : 400,
              transition: 'all 0.15s',
            }}
          >
            {LANG_LABELS[l]}
          </button>
        ))}
      </div>

      {/* Steps */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {steps.map((step, idx) => {
          const isLocked = idx > 0 && !steps[idx - 1].done && !step.done;

          return (
            <div
              key={step.id}
              style={{
                background: 'var(--card)',
                border: step.done
                  ? '1px solid var(--green)'
                  : isLocked
                  ? '1px solid var(--paper-edge)'
                  : '1px solid var(--hairline)',
                borderRadius: 'var(--r-md)',
                overflow: 'hidden',
                opacity: isLocked ? 0.55 : 1,
                transition: 'opacity 0.2s, border-color 0.2s',
              }}
            >
              {/* Header */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: '16px',
                padding: '18px 24px',
                borderBottom: step.done ? 'none' : '1px solid var(--hairline)',
                background: step.done ? 'var(--green-paper)' : 'transparent',
              }}>
                {/* Step indicator */}
                <div style={{
                  width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: step.done ? 'var(--green)' : 'var(--paper-warm)',
                  border: step.done ? 'none' : '1px solid var(--hairline-2)',
                }}>
                  {step.done ? (
                    <svg viewBox="0 0 24 24" style={{ width: '14px', height: '14px', stroke: 'white', fill: 'none', strokeWidth: '2.5', strokeLinecap: 'round', strokeLinejoin: 'round' }}>
                      <path d="m5 13 4 4L19 7" />
                    </svg>
                  ) : (
                    <span style={{ fontFamily: 'var(--ff-mono)', fontSize: '11px', color: 'var(--ink-3)', fontWeight: 600 }}>
                      {step.id}
                    </span>
                  )}
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{
                    fontFamily: 'var(--ff-display)', fontSize: '15px',
                    color: step.done ? 'var(--green-deep)' : 'var(--ink)',
                    marginBottom: '2px',
                  }}>
                    {step.title}
                  </div>
                  <div style={{ fontSize: '12px', color: step.done ? 'var(--green-deep)' : 'var(--ink-3)', opacity: step.done ? 0.8 : 1 }}>
                    {step.description}
                  </div>
                </div>

                {step.done && (
                  <div style={{
                    fontFamily: 'var(--ff-mono)', fontSize: '10px', letterSpacing: '0.06em',
                    textTransform: 'uppercase', color: 'var(--green)',
                    background: 'white', border: '1px solid var(--green)',
                    padding: '3px 8px', borderRadius: 'var(--r-xs)',
                  }}>
                    Done
                  </div>
                )}
              </div>

              {/* Code + action */}
              {!step.done && !isLocked && (
                <div style={{ padding: '20px 24px' }}>
                  {/* Code block */}
                  <div style={{ position: 'relative', marginBottom: '16px' }}>
                    <pre style={{
                      background: '#0f1117',
                      borderRadius: 'var(--r-sm)',
                      padding: '16px 20px',
                      fontFamily: 'var(--ff-mono)',
                      fontSize: '12px',
                      lineHeight: 1.6,
                      color: '#e2e8f0',
                      overflowX: 'auto',
                      margin: 0,
                      whiteSpace: 'pre',
                    }}>
                      <code>{step.snippets[lang].replace('{YOUR_API_KEY}', apiKeyPrefix ? `${apiKeyPrefix}...` : '{YOUR_API_KEY}')}</code>
                    </pre>
                    <button
                      onClick={() => copy(step.snippets[lang], step.id)}
                      style={{
                        position: 'absolute', top: '10px', right: '10px',
                        padding: '4px 10px',
                        background: copied === step.id ? 'var(--green)' : 'rgba(255,255,255,0.1)',
                        border: 'none', borderRadius: 'var(--r-xs)',
                        cursor: 'pointer', fontFamily: 'var(--ff-mono)',
                        fontSize: '10px', color: 'white',
                        transition: 'background 0.2s',
                      }}
                    >
                      {copied === step.id ? 'Copied!' : 'Copy'}
                    </button>
                  </div>

                  {step.href && (
                    <a
                      href={step.href}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: '6px',
                        fontFamily: 'var(--ff-mono)', fontSize: '12px',
                        color: 'var(--green)', textDecoration: 'none',
                        border: '1px solid var(--green)', padding: '7px 14px',
                        borderRadius: 'var(--r-sm)',
                        transition: 'background 0.15s',
                      }}
                    >
                      {step.hrefLabel} →
                    </a>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Docs callout */}
      <div style={{
        marginTop: '28px', padding: '16px 20px',
        background: 'var(--paper-warm)', border: '1px dashed var(--paper-edge)',
        borderRadius: 'var(--r-sm)', display: 'flex', gap: '16px', alignItems: 'center',
      }}>
        <div style={{ flex: 1, fontSize: '12px', color: 'var(--ink-2)', lineHeight: 1.6 }}>
          <strong style={{ color: 'var(--ink)', display: 'block', marginBottom: '4px' }}>Full API reference</strong>
          OpenAPI spec, SDK docs, and Postman collection — covers all endpoints with request/response examples.
        </div>
        <a
          href="/api-docs"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontFamily: 'var(--ff-mono)', fontSize: '11px',
            color: 'var(--ink-2)', textDecoration: 'none',
            border: '1px solid var(--hairline-2)', padding: '7px 14px',
            borderRadius: 'var(--r-sm)', whiteSpace: 'nowrap',
          }}
        >
          OpenAPI →
        </a>
      </div>
    </div>
  );
}
