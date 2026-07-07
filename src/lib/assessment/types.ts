export type AssessmentEcosystem =
  | 'vercel_ai_sdk_openai'
  | 'python_agent_stack'
  | 'mastra'
  | 'mcp_webmcp'
  | 'custom_unknown';

export type ComplianceFramework = 'eu_ai_act' | 'mica' | 'nist';

export type AssessmentStatus = 'completed' | 'limited';
export type AssessmentSegment =
  | 'regulated_operator'
  | 'autonomous_enterprise_software'
  | 'early_ai_productivity_tool'
  | 'insufficient_public_evidence';

export type RiskLevel = 'low' | 'moderate' | 'high' | 'critical';
export type RegulatoryRelevance = 'likely_review_warranted' | 'possible' | 'weak_evidence' | 'not_supported';

export interface RiskCategory {
  key: 'impersonation' | 'auditability' | 'revocation' | 'regulatory';
  label: string;
  score: number;
  reason: string;
}

export interface CertificateRiskProfile {
  overallScore: number;
  overallLabel: RiskLevel;
  headline: string;
  disclaimer: string;
  categories: RiskCategory[];
}

export interface FrameworkFinding {
  framework: ComplianceFramework;
  label: string;
  reason: string;
}

export interface EcosystemFinding {
  ecosystem: AssessmentEcosystem;
  label: string;
  confidence: number;
}

export interface WebsiteSignalGroup {
  explicitAiClaims: string[];
  autonomyClaims: string[];
  industrySignals: string[];
  regulatedActivitySignals: string[];
  integrationSignals: string[];
  trustSignals: string[];
  machineIdentitySignals: string[];
  missingSignalObservations: string[];
}

export interface DiscoveredPage {
  url: string;
  label: string;
}

export interface NewsSignal {
  title: string;
  publisher: string;
  publishedAt: string;
  url: string;
  relevanceNote: string;
  effect: 'strengthens' | 'weakens' | 'neutral';
}

export interface AssessmentEvidencePacket {
  company_profile: {
    domain: string;
    title: string | null;
    description: string | null;
    categoryLabels: string[];
    publicLinks: DiscoveredPage[];
  };
  website_signals: WebsiteSignalGroup;
  news_signals: NewsSignal[];
  scan_limits: string[];
}

export interface LLMAssessmentResult {
  segment: AssessmentSegment;
  confidence: number;
  observed_signals: string[];
  external_evidence: string[];
  missing_trust_signals: string[];
  business_risks: string[];
  regulatory_relevance: {
    eu_ai_act: RegulatoryRelevance;
    mica: RegulatoryRelevance;
    nist: RegulatoryRelevance;
  };
  why_kakunin_now: string;
  why_not_now: string;
  recommended_next_step: string;
  email_report_summary: string;
  cta_path: '/attestation-template' | '/docs/quickstart-ai-agents' | '/contact-sales';
  limitations: string[];
}

export interface AssessmentEvidenceRecord {
  accessible: boolean;
  contentType: string | null;
  packet: AssessmentEvidencePacket;
  assessment: LLMAssessmentResult;
  ecosystemKeywords: string[];
}

export interface AssessmentScanResult {
  status: AssessmentStatus;
  inputUrl: string;
  normalizedUrl: string;
  finalUrl: string;
  websiteDomain: string;
  pageTitle: string | null;
  pageDescription: string | null;
  ecosystem: AssessmentEcosystem;
  ecosystemLabel: string;
  ecosystemConfidence: number;
  frameworks: ComplianceFramework[];
  frameworkLabels: string[];
  recommendation: string;
  summary: string;
  certificateRisk: CertificateRiskProfile;
  segment: AssessmentSegment;
  observedSignals: string[];
  missingTrustSignals: string[];
  whyKakuninNow: string;
  whyNotNow: string;
  recommendedNextStep: string;
  limitations: string[];
  ctaPath: LLMAssessmentResult['cta_path'];
  regulatoryRelevance: LLMAssessmentResult['regulatory_relevance'];
  externalEvidence: string[];
  evidence: AssessmentEvidenceRecord;
}
