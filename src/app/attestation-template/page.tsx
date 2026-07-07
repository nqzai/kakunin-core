/**
 * /attestation-template
 *
 * Printable EU AI Act / MiCA compliance attestation letter template.
 * Operators fill in the bracketed fields and print to PDF for auditors.
 *
 * Print-optimised: @media print hides nav/buttons, keeps letter layout.
 * Linked from GET /api/v1/agents/:id/compliance-report → template_url
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { PrintButton } from './PrintButton';

export const metadata: Metadata = {
  title: 'AI Agent Compliance Attestation Template — Kakunin',
  description:
    'EU AI Act Article 50 and MiCA Article 70 compliance attestation letter template for AI agent operators. Print to PDF for auditors.',
  robots: { index: true, follow: true },
};

export default function AttestationTemplatePage() {
  return (
    <>
      {/* Print-only: hide everything except the letter */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; }
          .letter { box-shadow: none !important; border: none !important; }
        }
        @media screen {
          body { background: #f3f4f6; }
        }
      `}</style>

      {/* Toolbar — hidden on print */}
      <div className="no-print bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-gray-900">Kakunin</span>
          <span className="text-gray-300">|</span>
          <span className="text-sm text-gray-500">Compliance Attestation Template</span>
        </div>
        <div className="flex gap-3">
          <Link
            href="/docs/attestation-template"
            className="text-sm text-gray-600 hover:text-gray-900 underline"
          >
            Docs
          </Link>
          <PrintButton />
        </div>
      </div>

      {/* Letter container */}
      <div className="min-h-screen py-10 px-4">
        <div
          className="letter bg-white max-w-[210mm] mx-auto shadow-lg border border-gray-200 p-[20mm]"
          style={{ fontFamily: 'Georgia, Times New Roman, serif', fontSize: '11pt', lineHeight: '1.6', color: '#111' }}
        >

          {/* Letterhead */}
          <div style={{ borderBottom: '2px solid #111', paddingBottom: '8mm', marginBottom: '8mm' }}>
            <div style={{ fontSize: '18pt', fontWeight: 'bold', letterSpacing: '0.02em' }}>
              AI AGENT COMPLIANCE ATTESTATION
            </div>
            <div style={{ fontSize: '9pt', color: '#555', marginTop: '2mm' }}>
              Issued pursuant to EU AI Act Article 50 &amp; MiCA Article 70
            </div>
          </div>

          {/* Reference block */}
          <table style={{ width: '100%', marginBottom: '8mm', fontSize: '10pt' }}>
            <tbody>
              <tr>
                <td style={{ width: '40%', color: '#555' }}>Attestation Reference:</td>
                <td><strong>[ATTEST-YYYY-NNNN]</strong></td>
              </tr>
              <tr>
                <td style={{ color: '#555' }}>Date of Issue:</td>
                <td><strong>[DD Month YYYY]</strong></td>
              </tr>
              <tr>
                <td style={{ color: '#555' }}>Issuing Organisation:</td>
                <td><strong>[Legal Entity Name]</strong></td>
              </tr>
              <tr>
                <td style={{ color: '#555' }}>Registration / Licence No.:</td>
                <td><strong>[Regulatory Registration Number]</strong></td>
              </tr>
              <tr>
                <td style={{ color: '#555' }}>Competent Authority:</td>
                <td><strong>[National Supervisory Body, Member State]</strong></td>
              </tr>
            </tbody>
          </table>

          {/* Section 1 */}
          <div style={{ marginBottom: '6mm' }}>
            <div style={{ fontWeight: 'bold', fontSize: '11pt', borderBottom: '1px solid #ccc', marginBottom: '3mm', paddingBottom: '1mm' }}>
              1. AGENT IDENTITY
            </div>
            <table style={{ width: '100%', fontSize: '10pt', borderCollapse: 'collapse' }}>
              <tbody>
                {[
                  ['Agent Name', '[Agent Display Name]'],
                  ['Agent ID (Kakunin)', '[agt-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx]'],
                  ['Model / Weights', '[Model Name and Version, e.g. GPT-4o-2024-11-20]'],
                  ['Model Hash (SHA-256)', '[64-character hex hash of model weights]'],
                  ['Agent Version', '[Semver, e.g. 1.2.3]'],
                  ['Deployment Environment', '[Production / Staging]'],
                ].map(([label, placeholder]) => (
                  <tr key={label} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '1.5mm 0', width: '45%', color: '#555' }}>{label}</td>
                    <td style={{ padding: '1.5mm 0' }}>{placeholder}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Section 2 */}
          <div style={{ marginBottom: '6mm' }}>
            <div style={{ fontWeight: 'bold', fontSize: '11pt', borderBottom: '1px solid #ccc', marginBottom: '3mm', paddingBottom: '1mm' }}>
              2. CRYPTOGRAPHIC CERTIFICATE (X.509 + W3C VC)
            </div>
            <table style={{ width: '100%', fontSize: '10pt', borderCollapse: 'collapse' }}>
              <tbody>
                {[
                  ['Certificate Serial No.', '[XX:XX:XX:XX:XX:XX:XX:XX]'],
                  ['Certificate Authority', 'Kakunin CA — did:web:kakunin.ai'],
                  ['KMS Key ARN', '[arn:aws:kms:eu-west-1:ACCOUNT:key/KEY-ID]'],
                  ['Issued At', '[ISO 8601 timestamp]'],
                  ['Expires At', '[ISO 8601 timestamp]'],
                  ['W3C Verifiable Credential', '[vc+jwt present / not issued]'],
                  ['DID Document', 'https://kakunin.ai/.well-known/did.json'],
                ].map(([label, placeholder]) => (
                  <tr key={label} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '1.5mm 0', width: '45%', color: '#555' }}>{label}</td>
                    <td style={{ padding: '1.5mm 0', fontSize: '9.5pt' }}>{placeholder}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Section 3 */}
          <div style={{ marginBottom: '6mm' }}>
            <div style={{ fontWeight: 'bold', fontSize: '11pt', borderBottom: '1px solid #ccc', marginBottom: '3mm', paddingBottom: '1mm' }}>
              3. BEHAVIORAL MONITORING SUMMARY (30-DAY WINDOW)
            </div>
            <table style={{ width: '100%', fontSize: '10pt', borderCollapse: 'collapse' }}>
              <tbody>
                {[
                  ['Events Ingested', '[N events]'],
                  ['Current Risk Score', '[0.000 — low / medium / high]'],
                  ['Average Risk Score', '[0.000]'],
                  ['High-Risk Events (≥ 0.85)', '[N — auto-revocation threshold]'],
                  ['Pre-Revocation Warnings (≥ 0.75)', '[N]'],
                  ['Period Covered', '[YYYY-MM-DD] to [YYYY-MM-DD]'],
                  ['Monitoring Platform', 'Kakunin Behavioral Analytics'],
                ].map(([label, placeholder]) => (
                  <tr key={label} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '1.5mm 0', width: '45%', color: '#555' }}>{label}</td>
                    <td style={{ padding: '1.5mm 0' }}>{placeholder}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Section 4 */}
          <div style={{ marginBottom: '6mm' }}>
            <div style={{ fontWeight: 'bold', fontSize: '11pt', borderBottom: '1px solid #ccc', marginBottom: '3mm', paddingBottom: '1mm' }}>
              4. RCM CONTROL ASSESSMENT
            </div>
            <table style={{ width: '100%', fontSize: '9.5pt', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f9fafb' }}>
                  <th style={{ padding: '2mm', textAlign: 'left', borderBottom: '1px solid #d1d5db', width: '12%' }}>Control</th>
                  <th style={{ padding: '2mm', textAlign: 'left', borderBottom: '1px solid #d1d5db', width: '40%' }}>Description</th>
                  <th style={{ padding: '2mm', textAlign: 'left', borderBottom: '1px solid #d1d5db', width: '12%' }}>Status</th>
                  <th style={{ padding: '2mm', textAlign: 'left', borderBottom: '1px solid #d1d5db' }}>Evidence</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['C-A1', 'Agent cryptographic identity (X.509)', '[PASS/FAIL]', 'Cert serial [XX:XX:XX] active'],
                  ['C-A2', 'Model hash pinning (SHA-256)', '[PASS/FAIL]', 'model_hash recorded in cert OID'],
                  ['C-B1', 'Behavioral event ingestion', '[PASS/FAIL]', '[N] events in 30-day window'],
                  ['C-B2', 'Risk scoring engine', '[PASS/FAIL]', 'Score [0.000], band [low]'],
                  ['C-B3', 'Behavioral drift detection', '[PASS/N/A]', 'Baseline from [N] events'],
                  ['C-C1', 'Certificate revocation capability', '[PASS/N/A]', 'Immediate revocation available'],
                  ['C-D1', 'Kill switch / signed halt receipt', '[PASS/N/A]', 'Halt receipt issued on revocation'],
                  ['C-E1', 'Audit log immutability (WORM)', 'PASS', 'PostgreSQL rules + S3 WORM backup'],
                  ['C-F1', 'Compliance report generation', 'PASS', 'This attestation + LLM report available'],
                  ['C-G1', 'Decision chain integrity (HMAC)', 'PASS', 'HMAC-SHA256 entry_hash on every row'],
                ].map(([id, desc, status, evidence]) => (
                  <tr key={id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '1.5mm 2mm', fontFamily: 'monospace', fontSize: '9pt' }}>{id}</td>
                    <td style={{ padding: '1.5mm 2mm' }}>{desc}</td>
                    <td style={{ padding: '1.5mm 2mm', fontWeight: 'bold', color: status === 'PASS' ? '#15803d' : status === 'FAIL' ? '#dc2626' : '#6b7280' }}>{status}</td>
                    <td style={{ padding: '1.5mm 2mm', color: '#555' }}>{evidence}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Section 5 — Regulatory */}
          <div style={{ marginBottom: '6mm' }}>
            <div style={{ fontWeight: 'bold', fontSize: '11pt', borderBottom: '1px solid #ccc', marginBottom: '3mm', paddingBottom: '1mm' }}>
              5. REGULATORY COMPLIANCE DECLARATIONS
            </div>
            <div style={{ fontSize: '10pt', marginBottom: '3mm' }}>
              <strong>EU AI Act — Article 50 (Transparency obligations):</strong>
              <br />
              The deploying organisation declares that the above-named AI agent is subject to continuous cryptographic identity verification, real-time behavioral monitoring, and immutable audit logging as required under Article 50 of Regulation (EU) 2024/1689. All logged interactions are available for inspection by the competent supervisory authority upon request.
              <br />
              <strong>Compliance Status: [COMPLIANT / ACTION REQUIRED]</strong>
            </div>
            <div style={{ fontSize: '10pt' }}>
              <strong>MiCA — Article 70 (Operational risk requirements):</strong>
              <br />
              The deploying organisation declares that operational risk controls are implemented for this AI agent pursuant to Article 70 of Regulation (EU) 2023/1114, including: KMS-signed cryptographic certificate, model integrity verification, automated risk scoring, and incident notification to operators when risk scores exceed defined thresholds.
              <br />
              <strong>Compliance Status: [COMPLIANT / ACTION REQUIRED]</strong>
            </div>
          </div>

          {/* Section 6 — Signature */}
          <div style={{ marginBottom: '6mm' }}>
            <div style={{ fontWeight: 'bold', fontSize: '11pt', borderBottom: '1px solid #ccc', marginBottom: '3mm', paddingBottom: '1mm' }}>
              6. AUTHORISED SIGNATORY
            </div>
            <div style={{ fontSize: '10pt' }}>
              <p>I, the undersigned, being duly authorised on behalf of <strong>[Legal Entity Name]</strong>, hereby attest that the information contained in this document is accurate and complete to the best of my knowledge.</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6mm', marginTop: '8mm' }}>
                <div>
                  <div style={{ borderBottom: '1px solid #111', marginBottom: '1mm', paddingBottom: '8mm' }}></div>
                  <div style={{ fontSize: '9pt', color: '#555' }}>Signature</div>
                </div>
                <div>
                  <div style={{ borderBottom: '1px solid #111', marginBottom: '1mm', paddingBottom: '8mm' }}></div>
                  <div style={{ fontSize: '9pt', color: '#555' }}>Date</div>
                </div>
                <div>
                  <div style={{ borderBottom: '1px solid #111', marginBottom: '1mm', paddingBottom: '8mm' }}></div>
                  <div style={{ fontSize: '9pt', color: '#555' }}>Full Name &amp; Title</div>
                </div>
                <div>
                  <div style={{ borderBottom: '1px solid #111', marginBottom: '1mm', paddingBottom: '8mm' }}></div>
                  <div style={{ fontSize: '9pt', color: '#555' }}>Organisation Stamp (if applicable)</div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div style={{ borderTop: '1px solid #ccc', paddingTop: '4mm', fontSize: '8pt', color: '#777', marginTop: '4mm' }}>
            <p>
              This attestation was generated using Kakunin compliance infrastructure.
              Machine-readable attestation data: <code>GET https://www.kakunin.ai/api/v1/agents/[AGENT-ID]/compliance-report</code>
              <br />
              Certificate verifiable at: <code>https://www.kakunin.ai/api/v1/verify/[SERIAL]</code>
              &nbsp;·&nbsp; DID Document: <code>https://kakunin.ai/.well-known/did.json</code>
              &nbsp;·&nbsp; Template version: 1.0 (2026-05)
            </p>
          </div>
        </div>

        {/* Instruction panel — hidden on print */}
        <div className="no-print max-w-[210mm] mx-auto mt-6 bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-900">
          <strong>How to use:</strong> Replace all <code className="bg-amber-100 px-1 rounded">[bracketed fields]</code> with your agent&apos;s actual data from the API response at{' '}
          <code className="bg-amber-100 px-1 rounded">GET /api/v1/agents/:id/compliance-report</code>, then click <strong>Print / Save PDF</strong>.
          <br className="mt-1" />
          <span>
            Need the surrounding context? Review the{' '}
            <Link href="/docs/compliance-checklist" className="underline font-medium">
              compliance checklist
            </Link>
            , the{' '}
            <Link href="/api-docs" className="underline font-medium">
              API reference
            </Link>
            , and the{' '}
            <Link href="/platform/non-human-identity" className="underline font-medium">
              non-human identity overview
            </Link>
            .
          </span>
          <br className="mt-1" />
          <Link href="/docs/attestation-template" className="underline font-medium mt-2 inline-block">
            Full documentation →
          </Link>
        </div>
      </div>
    </>
  );
}
