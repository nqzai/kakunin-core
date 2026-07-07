/**
 * Standards Alignment Map
 *
 * Maps Kakunin's internal RCM control identifiers to external control
 * frameworks. Injected into the compliance report LLM prompt when the caller
 * requests standards-aligned output, and surfaced in the report API.
 *
 * Frameworks:
 *  - ISO 27001:2022 (EU/international baseline)
 *  - NIST CSF 2.0 (US de-facto cybersecurity framework)
 *  - NIST AI RMF 1.0 — GOVERN / MAP / MEASURE / MANAGE functions for AI risk
 *  - NIST NCCoE Agent Pillars — Identification / Authorization / Auditing /
 *    Non-repudiation (the agent-governance spec Kakunin maps 1:1)
 *
 * The AI RMF + NCCoE mappings back the website's "every framework" selector
 * and US-aligned compliance reports. Source: docs/US_REGULATORY_MAPPING.md.
 */

export type StandardsFramework = 'iso_27001' | 'nist_csf' | 'nist_ai_rmf' | 'nccoe';

interface ControlMapping {
  control_id: string;
  description: string;
  iso_27001?: string[];
  nist_csf?: string[];
  /** NIST AI RMF 1.0 function(s): GOVERN / MAP / MEASURE / MANAGE. */
  nist_ai_rmf?: string[];
  /** NIST NCCoE agent-governance pillar(s). */
  nccoe_pillar?: string[];
}

export const CONTROL_MAPPINGS: ControlMapping[] = [
  {
    control_id: 'C-A1',
    description: 'Agent cryptographic identity — X.509 certificate with model hash extension',
    iso_27001: ['A.5.15 — Access control', 'A.5.16 — Identity management'],
    nist_csf: ['PR.AA-01 — Identities and credentials are managed', 'PR.AA-03 — Users, services, and hardware are authenticated'],
    nist_ai_rmf: ['MAP — Context and inventory of where AI is used'],
    nccoe_pillar: ['Identification — distinct, verifiable identity per agent'],
  },
  {
    control_id: 'C-A2',
    description: 'Model hash pinning — SHA-256 of model weights in cert OID and agent record',
    iso_27001: ['A.8.9 — Configuration management', 'A.8.32 — Change management'],
    nist_csf: ['ID.AM-02 — Inventories of software, services, and systems are maintained'],
    nist_ai_rmf: ['MAP — Context and inventory of where AI is used'],
    nccoe_pillar: ['Identification — identity bound to the model the agent runs'],
  },
  {
    control_id: 'C-A3',
    description: 'Delegation chain — RFC 8693 act-claim making human→agent→sub-agent authority explicit',
    iso_27001: ['A.5.15 — Access control', 'A.5.16 — Identity management', 'A.5.18 — Access rights'],
    nist_csf: ['PR.AA-05 — Access permissions and authorizations are managed', 'PR.AA-01 — Identities and credentials are managed'],
    nist_ai_rmf: ['GOVERN — Accountability and roles for AI risk'],
    nccoe_pillar: [
      'Authorization — explicit human→agent→sub-agent authority chain',
      'Non-repudiation — link actions to the sanctioning human authority',
    ],
  },
  {
    control_id: 'C-B1',
    description: 'Behavioral event ingestion — real-time event stream with risk scoring',
    iso_27001: ['A.8.15 — Logging', 'A.8.16 — Monitoring activities'],
    nist_csf: ['DE.CM-01 — Networks and network services are monitored', 'DE.CM-03 — Personnel activity and technology usage are monitored'],
    nist_ai_rmf: ['MEASURE — Quantify and monitor AI risk'],
    nccoe_pillar: ['Auditing — activity monitoring and logging'],
  },
  {
    control_id: 'C-B2',
    description: 'Risk scoring engine — deterministic score + band classification per event',
    iso_27001: ['A.5.25 — Assessment and decision on information security events', 'A.5.7 — Threat intelligence'],
    nist_csf: ['DE.AE-02 — Potentially adverse events are analyzed', 'DE.AE-06 — Information on adverse events is provided to authorized staff'],
    nist_ai_rmf: ['MEASURE — Quantify and monitor AI risk'],
    nccoe_pillar: ['Auditing — analyze potentially adverse agent events'],
  },
  {
    control_id: 'C-B3',
    description: 'Behavioral drift detection — chi-squared baseline comparison with nightly scoring',
    iso_27001: ['A.8.16 — Monitoring activities', 'A.5.25 — Assessment and decision on information security events'],
    nist_csf: ['DE.AE-03 — Information is correlated from multiple sources', 'DE.CM-09 — Computing hardware and software are monitored'],
    nist_ai_rmf: ['MEASURE — Quantify and monitor AI risk'],
    nccoe_pillar: ['Auditing — correlate activity over time to detect drift'],
  },
  {
    control_id: 'C-C1',
    description: 'Certificate revocation — immediate cert status update + audit trail',
    iso_27001: ['A.5.17 — Authentication information', 'A.5.21 — Managing information security in the ICT supply chain'],
    nist_csf: ['PR.AA-06 — Physical access to assets is managed', 'RS.MA-01 — Incidents are contained'],
    nist_ai_rmf: ['MANAGE — Respond, prioritize, and recover'],
    nccoe_pillar: ["Authorization — revoke an agent's capability to act"],
  },
  {
    control_id: 'C-D1',
    description: 'Kill switch — cryptographically signed halt receipt; agent suspended + cert revoked',
    iso_27001: ['A.5.30 — ICT readiness for business continuity', 'A.5.26 — Response to information security incidents'],
    nist_csf: ['RS.RP-01 — The incident response plan is executed', 'RS.MA-02 — Incidents are escalated'],
    nist_ai_rmf: ['MANAGE — Respond, prioritize, and recover'],
    nccoe_pillar: ['Authorization — suspend agent capability', 'Non-repudiation — cryptographically signed halt receipt'],
  },
  {
    control_id: 'C-E1',
    description: 'Audit log immutability — append-only audit_log + S3 WORM backup',
    iso_27001: ['A.8.15 — Logging', 'A.8.17 — Clock synchronization'],
    nist_csf: ['PR.PT-01 — Logs are created, protected, retained, and analyzed'],
    nist_ai_rmf: ['GOVERN — Accountability and records for AI risk'],
    nccoe_pillar: ['Auditing — immutable activity log', 'Non-repudiation — immutable attribution trail'],
  },
  {
    control_id: 'C-F1',
    description: 'Compliance report generation — MiCA/EU AI Act structured report with PDF export',
    iso_27001: ['A.5.36 — Compliance with policies, rules and standards for information security'],
    nist_csf: ['GV.OC-01 — The organizational mission is understood', 'GV.RR-01 — Organizational leadership is responsible for cybersecurity risk'],
    nist_ai_rmf: ['GOVERN — Policies, accountability, and roles for AI risk'],
    nccoe_pillar: ['Auditing — regulator-facing reporting and export'],
  },
  {
    control_id: 'C-G1',
    description: 'Decision chain integrity — SHA-256 tamper-evident hash over ordered event UUIDs',
    iso_27001: ['A.8.17 — Clock synchronization', 'A.5.33 — Protection of records'],
    nist_csf: ['PR.PT-01 — Logs are created, protected, retained, and analyzed', 'ID.AM-08 — Systems, hardware, software, services, and data are managed throughout their life cycles'],
    nist_ai_rmf: ['MEASURE — Quantify and monitor AI risk'],
    nccoe_pillar: ['Auditing — reconstruct agent decisions', 'Non-repudiation — tamper-evident record of action'],
  },
  {
    control_id: 'C-H1',
    description: 'Output content-risk monitoring — manipulation/deception detection in agent output (EU AI Act Art. 5)',
    iso_27001: ['A.8.16 — Monitoring activities', 'A.5.25 — Assessment and decision on information security events'],
    nist_csf: ['DE.AE-02 — Potentially adverse events are analyzed', 'DE.CM-09 — Computing hardware and software are monitored'],
    nist_ai_rmf: ['MEASURE — Quantify and monitor AI risk'],
    nccoe_pillar: ['Auditing — analyze and record agent output behavior'],
  },
];

/** Human-readable framework names for prompt + report headers. */
export const FRAMEWORK_LABELS: Record<StandardsFramework, string> = {
  iso_27001: 'ISO 27001:2022',
  nist_csf: 'NIST CSF 2.0',
  nist_ai_rmf: 'NIST AI RMF 1.0',
  nccoe: 'NIST NCCoE Agent Pillars',
};

/** Which ControlMapping field holds each framework's references. */
const FRAMEWORK_FIELD: Record<StandardsFramework, keyof ControlMapping> = {
  iso_27001: 'iso_27001',
  nist_csf: 'nist_csf',
  nist_ai_rmf: 'nist_ai_rmf',
  nccoe: 'nccoe_pillar',
};

/** Stable render order regardless of request order. */
const FRAMEWORK_ORDER: StandardsFramework[] = ['iso_27001', 'nist_csf', 'nist_ai_rmf', 'nccoe'];

/**
 * Build the standards alignment section text to inject into the LLM prompt.
 * Returns an empty string when no frameworks are requested. Supports any
 * combination of the four supported frameworks.
 */
export function buildStandardsPromptSection(frameworks: StandardsFramework[]): string {
  const selected = FRAMEWORK_ORDER.filter((f) => frameworks.includes(f));
  if (selected.length === 0) return '';

  const rows = CONTROL_MAPPINGS.map((c) => {
    const refs: string[] = [];
    for (const f of selected) {
      const vals = c[FRAMEWORK_FIELD[f]] as string[] | undefined;
      if (vals && vals.length) refs.push(`${FRAMEWORK_LABELS[f]}: ${vals.join('; ')}`);
    }
    return `- ${c.control_id} (${c.description})\n  ${refs.join('\n  ')}`;
  }).join('\n\n');

  const frameworkNames = selected.map((f) => FRAMEWORK_LABELS[f]).join(', ');

  return `\nStandards Alignment (${frameworkNames}):\nMap each finding to the following control references. Add a "Standards Alignment" section at the end of the report with a table of Kakunin RCM controls and their ${frameworkNames} equivalents:\n\n${rows}`;
}
