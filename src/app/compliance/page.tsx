import type { Metadata } from 'next';
import { SiteNav } from '@/components/site/SiteNav';
import { SiteFooter } from '@/components/site/SiteFooter';
import Link from 'next/link';
import '../landing.css';
import { generateCollectionPage } from '@/lib/schema/generators';

export const metadata: Metadata = {
  title: 'AI Agent Compliance — One Platform, Every Framework | Kakunin',
  description: 'One engine, every framework. Map your AI agent controls to NIST AI RMF, NIST CSF 2.0, the NCCoE four-pillar model, ISO 27001, MiCA, and the EU AI Act — and render a compliance report to your regime in one click.',
  alternates: { canonical: '/compliance' },
  openGraph: {
    title: 'AI Agent Compliance — One Platform, Every Framework',
    description: 'Map agent controls to NIST AI RMF, NIST CSF 2.0, NCCoE, ISO 27001, MiCA, and the EU AI Act. Same engine — pick your framework.',
    url: 'https://www.kakunin.ai/compliance',
    siteName: 'Kakunin',
    type: 'website',
  },
};

/**
 * Framework coverage by region. Backed by lib/compliance/standards-map.ts,
 * which maps every RCM control to these frameworks (shipped in v2: nist_ai_rmf,
 * nist_csf, nccoe alongside iso_27001 + the existing EU mappings).
 */
const regions = [
  {
    id: 'us',
    flag: '🇺🇸',
    name: 'United States',
    lead: 'NIST AI RMF · NIST CSF 2.0 · NCCoE',
    frameworks: [
      'NIST AI RMF — all four functions (Govern, Map, Measure, Manage)',
      'NIST CSF 2.0 — full control mapping',
      'NCCoE four-pillar model — Identification, Authorization, Auditing, Non-repudiation',
    ],
    supports: 'Supports GLBA, SOX, PCI DSS, and SEC recordkeeping obligations.',
  },
  {
    id: 'eu',
    flag: '🇪🇺',
    name: 'European Union',
    lead: 'EU AI Act · MiCA · GDPR',
    frameworks: [
      'EU AI Act — Art. 5 (prohibited practices) + Art. 50 (transparency)',
      'MiCA — Art. 70 record-keeping for crypto-asset service providers',
      'GDPR — logging, traceability, and data-residency controls',
    ],
    supports: 'Aligned with BaFin, AMF, and national competent-authority expectations.',
  },
  {
    id: 'global',
    flag: '🌐',
    name: 'Global',
    lead: 'ISO 27001 · NIST CSF 2.0',
    frameworks: [
      'ISO 27001:2022 — Annex A access, logging, and change controls',
      'NIST CSF 2.0 — the cross-border lingua franca',
      'One control set, rendered to whichever regime asks',
    ],
    supports: 'Same engine, any market — no product rebuild per region.',
  },
];

const hubs = [
  {
    cityId: 'berlin',
    cityName: 'Berlin',
    country: 'Germany',
    focus: 'Legal Tech & Algorithmic Audit Hub',
    desc: 'Secure EU AI Act agent compliance aligned with BaFin standards.',
    emoji: '🇩🇪',
  },
  {
    cityId: 'paris',
    cityName: 'Paris',
    country: 'France',
    focus: 'AI Tech & Cryptographic Verification Hub',
    desc: 'Verify Mistral-class and custom model lineage at the API gateway.',
    emoji: '🇫🇷',
  },
  {
    cityId: 'dublin',
    cityName: 'Dublin',
    country: 'Ireland',
    focus: 'EU Headquarter & Platform Scale Hub',
    desc: 'Scale GDPR-compliant AI agent infrastructure with zero-trust database bindings.',
    emoji: '🇮🇪',
  },
  {
    cityId: 'brussels',
    cityName: 'Brussels',
    country: 'Belgium',
    focus: 'EU Governance & Policy Compliance Hub',
    desc: 'Enforce EU AI Act compliance with cryptographic accountability.',
    emoji: '🇧🇪',
  },
  {
    cityId: 'zug',
    cityName: 'Zug',
    country: 'Switzerland',
    focus: 'Crypto Valley & Decoupled Token Transaction Hub',
    desc: 'MiCA compliance logs for autonomous agents in decentralized finance.',
    emoji: '🇨🇭',
  },
];

export default function CompliancePage() {
  const complianceSchema = generateCollectionPage(
    'Compliance Hubs — Regional AI Agent Compliance',
    'https://www.kakunin.ai/compliance',
    'Localized compliance guides for AI agents across EU and global markets. Berlin, Paris, Dublin, Brussels, Zug.',
    hubs.map((hub, idx) => ({
      position: idx + 1,
      url: `https://www.kakunin.ai/compliance/hub/${hub.cityId}`,
      name: `${hub.cityName} — ${hub.focus}`,
      description: hub.desc,
    })),
    [
      { position: 1, name: 'Home', item: 'https://www.kakunin.ai' },
      { position: 2, name: 'Compliance', item: 'https://www.kakunin.ai/compliance' },
    ]
  );

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(complianceSchema) }}
      />
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <SiteNav active="home" />

        <main style={{ flex: 1, width: '100%' }}>
          {/* Breadcrumbs */}
          <div style={{
            background: 'var(--paper)',
            borderBottom: '1px solid var(--paper-edge)',
            padding: '16px 24px',
          }}>
            <div className="container" style={{ maxWidth: 'var(--container)', margin: '0 auto' }}>
              <div style={{
                fontSize: '13px',
                color: 'var(--ink-2)',
              }}>
                <Link href="/" style={{ color: 'var(--ink)', textDecoration: 'none' }}>Home</Link>
                <span style={{ margin: '0 8px' }}>/</span>
                <span style={{ color: 'var(--ink)', fontWeight: 600 }}>Compliance Hubs</span>
              </div>
            </div>
          </div>

          {/* Hero Section */}
          <section style={{
            background: 'linear-gradient(180deg, var(--paper-warm) 0%, var(--paper) 100%)',
            padding: '100px 24px 80px',
            borderBottom: '1px solid var(--paper-edge)',
            textAlign: 'center',
          }}>
            <div className="container" style={{ maxWidth: '900px', margin: '0 auto' }}>
              <h1 style={{
                fontFamily: 'var(--ff-display)',
                fontSize: 'clamp(36px, 5vw, 54px)',
                lineHeight: 1.05,
                color: 'var(--ink)',
                marginBottom: '24px',
                letterSpacing: '-0.02em',
                textTransform: 'uppercase',
              }}>
                One Platform. Every Framework.
              </h1>
              <p style={{
                fontFamily: 'var(--ff-body)',
                fontSize: '18px',
                lineHeight: 1.6,
                color: 'var(--ink-2)',
                marginBottom: '40px',
                maxWidth: '720px',
                margin: '0 auto 40px',
              }}>
                Kakunin maps every agent control to the standard you answer to — NIST AI RMF, NIST CSF 2.0, the NCCoE four-pillar model, ISO 27001, MiCA, and the EU AI Act. Same engine. Pick your regime. Compliance reports render to your framework in one click.
              </p>
            </div>
          </section>

          {/* Framework selector — US / EU / Global */}
          <section style={{
            padding: '80px 24px',
            background: 'var(--paper-warm)',
            borderBottom: '1px solid var(--paper-edge)',
          }}>
            <div className="container" style={{ maxWidth: 'var(--container)', margin: '0 auto' }}>
              <div style={{ textAlign: 'center', marginBottom: '48px' }}>
                <div style={{
                  fontFamily: 'var(--ff-mono)',
                  fontSize: '11px',
                  color: 'var(--green-deep)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.12em',
                  marginBottom: '12px',
                }}>
                  Compliance, your way
                </div>
                <h2 style={{
                  fontFamily: 'var(--ff-display)',
                  fontSize: 'clamp(26px, 3.5vw, 36px)',
                  textTransform: 'uppercase',
                  color: 'var(--ink)',
                  letterSpacing: '-0.01em',
                }}>
                  Map your agent to any regime
                </h2>
              </div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '24px',
              }}>
                {regions.map((region) => (
                  <div key={region.id} style={{
                    background: 'var(--card)',
                    border: '1px solid var(--paper-edge)',
                    borderRadius: 'var(--r-lg)',
                    padding: '32px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px',
                  }}>
                    <div style={{ fontSize: '36px', lineHeight: 1 }}>{region.flag}</div>
                    <div>
                      <h3 style={{
                        fontFamily: 'var(--ff-display)',
                        fontSize: '20px',
                        textTransform: 'uppercase',
                        color: 'var(--ink)',
                        marginBottom: '6px',
                      }}>
                        {region.name}
                      </h3>
                      <div style={{
                        fontFamily: 'var(--ff-mono)',
                        fontSize: '11px',
                        color: 'var(--green-deep)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                      }}>
                        {region.lead}
                      </div>
                    </div>
                    <ul style={{
                      listStyle: 'none',
                      padding: 0,
                      margin: 0,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                    }}>
                      {region.frameworks.map((fw) => (
                        <li key={fw} style={{
                          fontSize: '14px',
                          color: 'var(--ink-2)',
                          lineHeight: 1.5,
                          paddingLeft: '18px',
                          position: 'relative',
                        }}>
                          <span style={{
                            position: 'absolute',
                            left: 0,
                            color: 'var(--green)',
                            fontWeight: 700,
                          }}>✓</span>
                          {fw}
                        </li>
                      ))}
                    </ul>
                    <p style={{
                      marginTop: 'auto',
                      fontSize: '13px',
                      fontStyle: 'italic',
                      color: 'var(--ink-3)',
                      lineHeight: 1.5,
                    }}>
                      {region.supports}
                    </p>
                  </div>
                ))}
              </div>
              <p style={{
                textAlign: 'center',
                marginTop: '32px',
                fontFamily: 'var(--ff-mono)',
                fontSize: '12px',
                color: 'var(--ink-3)',
              }}>
                One control set, every framework — backed by Kakunin&apos;s standards engine.
              </p>
            </div>
          </section>

          {/* Hub Cards Grid */}
          <section style={{
            padding: '80px 24px',
            background: 'var(--paper)',
          }}>
            <div className="container" style={{ maxWidth: 'var(--container)', margin: '0 auto' }}>
              <div style={{ textAlign: 'center', marginBottom: '48px' }}>
                <div style={{
                  fontFamily: 'var(--ff-mono)',
                  fontSize: '11px',
                  color: 'var(--green-deep)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.12em',
                  marginBottom: '12px',
                }}>
                  Regional deep-dives
                </div>
                <h2 style={{
                  fontFamily: 'var(--ff-display)',
                  fontSize: 'clamp(26px, 3.5vw, 36px)',
                  textTransform: 'uppercase',
                  color: 'var(--ink)',
                  letterSpacing: '-0.01em',
                }}>
                  Local guides for regulated markets
                </h2>
              </div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '32px',
              }}>
                {hubs.map((hub) => (
                  <Link
                    key={hub.cityId}
                    href={`/compliance/hub/${hub.cityId}`}
                    style={{
                      textDecoration: 'none',
                      color: 'inherit',
                      display: 'block',
                    }}
                  >
                    <div style={{
                      background: 'var(--card)',
                      border: '1px solid var(--paper-edge)',
                      borderRadius: 'var(--r-lg)',
                      padding: '40px',
                      height: '100%',
                      transition: 'all 0.3s ease',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '16px',
                    }}
                    className="hub-card"
                    >
                      <div style={{
                        fontSize: '40px',
                        lineHeight: 1,
                      }}>
                        {hub.emoji}
                      </div>
                      <div>
                        <h3 style={{
                          fontFamily: 'var(--ff-display)',
                          fontSize: '20px',
                          textTransform: 'uppercase',
                          color: 'var(--ink)',
                          marginBottom: '8px',
                        }}>
                          {hub.cityName}
                        </h3>
                        <div style={{
                          fontFamily: 'var(--ff-mono)',
                          fontSize: '11px',
                          color: 'var(--green-deep)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.08em',
                          marginBottom: '12px',
                        }}>
                          {hub.country}
                        </div>
                        <div style={{
                          fontFamily: 'var(--ff-mono)',
                          fontSize: '12px',
                          color: 'var(--ink-2)',
                          marginBottom: '12px',
                          fontStyle: 'italic',
                        }}>
                          {hub.focus}
                        </div>
                        <p style={{
                          fontSize: '14px',
                          color: 'var(--ink-2)',
                          lineHeight: 1.6,
                          margin: 0,
                        }}>
                          {hub.desc}
                        </p>
                      </div>
                      <div style={{
                        marginTop: 'auto',
                        color: 'var(--green)',
                        fontSize: '13px',
                        fontWeight: 600,
                      }}>
                        Explore Hub →
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>

          {/* CTA Section */}
          <section style={{
            background: 'var(--green-deep)',
            color: 'var(--paper)',
            padding: '80px 24px',
            textAlign: 'center',
          }}>
            <div className="container" style={{ maxWidth: '640px', margin: '0 auto' }}>
              <h2 style={{
                fontFamily: 'var(--ff-display)',
                fontSize: '28px',
                textTransform: 'uppercase',
                marginBottom: '16px',
              }}>
                Deploy Compliant Agents Today
              </h2>
              <p style={{
                fontSize: '15px',
                lineHeight: 1.6,
                marginBottom: '32px',
                color: 'var(--green-paper)',
              }}>
                Issue X.509 compliance certificates to your AI agents in under 15 minutes. Navigate regional requirements with confidence.
              </p>
              <Link href="/pricing" className="btn btn--paper btn--lg">
                Get Started Free
              </Link>
            </div>
          </section>
        </main>

        <SiteFooter />
      </div>
    </>
  );
}
