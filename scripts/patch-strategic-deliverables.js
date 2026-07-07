const apiKey = process.env.PLANE_API_KEY;
const workspaceSlug = 'kakunin';
const projectId = 'ab9b6f45-8219-40cf-a03b-2f93313f2464';
const baseUrl = 'https://api.plane.so';

const updates = [
  {
    issueId: 'ad797a64-dc9e-413a-a6a0-e2fc6139c6e5', // KAK-M1.1: Compliance Officer Clara
    name: 'KAK-M1.1: Define Persona - Compliance Officer Clara & AI Agent Audit Checklist',
    description_html: `
      <h2>Compliance Officer Clara Persona & Lead-Magnet Compliance Checklist</h2>
      <p>This issue now contains the finalized collateral draft for Compliance Officer Clara, mapping regulatory audits to Kakunin security features.</p>
      
      <hr/>
      <h3>AI Agent Compliance & Audit Readiness Checklist</h3>
      <p><em>A C-Suite Guide to Securing Autonomous Workflows under the EU AI Act, MiCA, and DORA</em></p>
      
      <h4>Section 1: Provenance & Identity Validation</h4>
      <ul>
        <li><strong>Model Weight Hashing:</strong> Are your model versions and weights cryptographically hashed to ensure that security configurations have not been silently modified or drifted?</li>
        <li><strong>System Prompt Anchoring:</strong> Is the system prompt signed by a cryptographic key to prevent unauthorized modifications or prompt injections at the hosting layer?</li>
        <li><strong>X.509 Machine Certificates:</strong> Does every active agent possess a unique, short-lived X.509 certificate generated from a hardware security module (HSM) or secure cloud KMS?</li>
        <li><strong>Credential Isolation:</strong> Are dynamic agent actions free from hardcoded master API keys or long-lived database passwords?</li>
      </ul>
      <p><strong>How Kakunin helps:</strong> Kakunin signs model weight hashes and system prompts directly into short-lived session certificates, ensuring absolute cryptographic identity.</p>
      
      <h4>Section 2: Scoped Permissions & Tool Constraints</h4>
      <ul>
        <li><strong>Dynamic Scope Boundaries:</strong> Are agent certificates restricted to specific, granular OAuth-like scopes (e.g. <code>transactions:read</code> but NOT <code>transactions:write</code>)?</li>
        <li><strong>Tool Execution Verification:</strong> Does your API gateway verify scopes <em>before</em> allowing an agent to execute database queries or call external APIs?</li>
        <li><strong>Database Row-Level Security (RLS):</strong> Are database operations bound dynamically to the agent’s session identity, ensuring they cannot read neighboring customer schemas?</li>
      </ul>
      <p><strong>How Kakunin helps:</strong> The <code>@verify_agent_scope</code> decorator and native gateway adapters enforce programmatic boundary checks at the runtime edge with under 5ms of latency.</p>
      
      <h4>Section 3: Forensic Audit Trail & Non-Repudiation</h4>
      <ul>
        <li><strong>WORM (Write Once Read Many) Storage:</strong> Are agent prompt logs, decisions, and network calls written to immutable storage that cannot be retroactively altered, even by database administrators?</li>
        <li><strong>Decision Hashing & Signing:</strong> Is every intermediate reasoning step (CoT) cryptographically signed by the agent’s session key at the moment of execution?</li>
        <li><strong>Human-in-the-Loop Signatures:</strong> When a human supervisor approves a high-risk agent decision, is the approval digitally signed to guarantee non-repudiation?</li>
      </ul>
      <p><strong>How Kakunin helps:</strong> Every audit packet is signed via KMS private keys and pushed directly to secure, immutable logs, providing complete legal defensibility.</p>
      
      <h4>Section 4: Operational Resilience & Revocation</h4>
      <ul>
        <li><strong>Dynamic Risk Scoring:</strong> Does your system monitor prompt/output drift and tool-execution speed in real-time to generate a behavior-based risk score?</li>
        <li><strong>Immediate Revocation (Kill-Switch):</strong> Can you instantly invalidate a single agent’s credentials via Online Certificate Status Protocol (OCSP) without taking other agents offline?</li>
        <li><strong>Financial Circuit Breakers:</strong> Are hard spend and token limits enforced programmatically per agent session to block infinite loop billing errors?</li>
      </ul>
      <p><strong>How Kakunin helps:</strong> The Kakunin Risk Engine monitors behavioral telemetry and leverages high-performance CRLs and OCSP checks to auto-revoke keys in real-time.</p>
    `
  },
  {
    issueId: '43ba2561-ea54-42ec-b677-c5e3cde70420', // KAK-M1.5: Align Website Copy
    name: 'KAK-M1.5: Align Website Copy with ICP Pain Points - Homepage Wireframe',
    description_html: `
      <h2>Website Homepage Copy Wireframe</h2>
      <p>This issue tracks the copywriting layout, structuring our homepage around our 5 primary buyer and infrastructure partner personas.</p>
      
      <hr/>
      <h3>1. Header & Navigation</h3>
      <ul>
        <li><strong>Logo:</strong> Kakunin AI (确认)</li>
        <li><strong>Links:</strong> Features | Integrations (Supabase, Vercel, API Gateways) | Open Trust Standards (did:kakunin) | Sandbox Simulator | Documentation</li>
        <li><strong>CTA:</strong> Launch Sandbox (Primary Outline, Glow)</li>
      </ul>
      
      <h3>2. Hero Section</h3>
      <p><strong>Headline:</strong> Secure Your AI Agent Fleet with Cryptographic Identity.</p>
      <p><strong>Sub-headline:</strong> <em>Kakunin issues ephemeral X.509 certificates to autonomous systems and copilots. Enforce gateway-level boundaries, automate database security, and establish audit trails that satisfy the EU AI Act.</em></p>
      <p><strong>CTAs:</strong> <code>[Launch Interactive Sandbox]</code> / <code>[Read the Open Standard]</code></p>
      
      <h3>3. The 3-Persona Corporate Tracks (Internal Alignment)</h3>
      <ul>
        <li><strong>Compliance Officers (Clara):</strong> <em>Protect Your Board from Autonomous Liability.</em> Stop worrying about black-box non-determinism. Kakunin creates cryptographically signed, immutable audit trails. Satisfy EU AI Act Article 12 and MiCA logging requirements natively. (Stat: 100% Audit Readiness)</li>
        <li><strong>CTO/VP Engineering (Devlin):</strong> <em>Ephemeral Credentials. Zero Setup Friction.</em> Replace high-risk static API keys. Issue short-lived session certificates backed by cloud KMS. Secure agent tools in minutes using simple decorators (<code>@verify_agent_scope</code>). (Stat: &lt;10 Minute SDK Integration)</li>
        <li><strong>Operations Directors (Omar):</strong> <em>Hard Circuit Breakers for Infinite Loops.</em> AI agents can run amok and blow your API budget in minutes. The Kakunin Risk Engine monitors behavioral telemetry, dynamically throttling or auto-revoking access if an agent drifts or loops. (Stat: $0 Runaway Billing Incidents)</li>
      </ul>
      
      <h3>4. The 2-Persona Platform & Gatekeeper Tracks (Ecosystem Trust)</h3>
      <ul>
        <li><strong>API Platforms (Alex):</strong> <em>Differentiate Bots from Certified Clients at Your Gateway.</em> Stop generic rate-limiting that kills developer API loops. Verify incoming Kakunin certificates directly at your Cloudflare Workers or Kong API Gateway. Read signed developer scopes and enforce client-side SLAs at the edge.</li>
        <li><strong>Infrastructure Partners (Ian):</strong> <em>Secure Databases Against Non-Deterministic AI Queries.</em> Prevent agent credential leaks at the runtime layer. Leverage official Kakunin integrations to bind active agent session certificates directly to database Row-Level Security (RLS) policies.</li>
      </ul>
      
      <h3>5. The Interactive Sandbox Call-to-Action</h3>
      <p><strong>Headline:</strong> Witness Auto-Revocation in Real-Time.</p>
      <p><strong>Copy:</strong> Run a simulated autonomous financial agent. Modify its system prompt to trigger a malicious loop or rate limit abuse. Watch the Kakunin risk engine flag the drift and auto-revoke its session certificate via OCSP in under 100 milliseconds.</p>
      
      <h3>6. Technical Specifications (Auditor Proofs)</h3>
      <p>Cloud KMS (AWS/GCP) HSM | X.509 v3 certificates | &lt;20ms OCSP check latency | &lt;5ms edge check overhead | did:kakunin W3C DID Standard | EU AI Act Article 12 | MiCA Algorithmic Trading compliance.</p>
    `
  },
  {
    issueId: 'a9cf0942-73fd-40b9-8dc0-14eeb6b9273b', // KAK-M1.8: Establish Open-Source Trust Standards
    name: 'KAK-M1.8: Establish Open-Source Trust Standards & DID Method Draft Outline',
    description_html: `
      <h2>W3C DID Method Specification Outline: did:kakunin</h2>
      <p>This issue tracks the open-source specification draft for the Kakunin machine identity standard, aiming to resolve the ecosystem trust loop.</p>
      
      <hr/>
      <h3>1. Abstract & Motivation</h3>
      <p>Traditional integrations rely on static credentials. In agentic AI ecosystems, a verifier needs to confirm client legitimacy, specific model version hashes, system prompt configurations, and owner signatures. <code>did:kakunin</code> leverages W3C DIDs to solve this.</p>
      
      <h3>2. DID Method Name & Syntax</h3>
      <p>The scheme is <code>did:kakunin</code>. Syntax:</p>
      <pre><code>did:kakunin:&lt;model-hash&gt;:&lt;prompt-hash&gt;:&lt;owner-pubkey&gt;</code></pre>
      <p><em>Example:</em> <code>did:kakunin:a3f9e872...:e2c1b899...:04a9f311...</code></p>
      
      <h3>3. DID Document Schema & Resolution</h3>
      <p>Resolves to a standard DID Document containing:</p>
      <ul>
        <li><strong>Verification Methods:</strong> Ed25519VerificationKey2020 session keys.</li>
        <li><strong>Authentication:</strong> Bindings to active session keys.</li>
        <li><strong>Service Endpoints:</strong> <code>OcspRevocationCheck</code> endpoint and <code>WormForensicLog</code> telemetry vault.</li>
      </ul>
      
      <h3>4. Lifecycle & CRUD Operations</h3>
      <ul>
        <li><strong>Create:</strong> Developer registers signed model & prompt hashes; Kakunin PKI issues X.509 session cert.</li>
        <li><strong>Read/Resolve:</strong> API Gateway checks OCSP or CRL status to resolve certificate legitimacy.</li>
        <li><strong>Update:</strong> Model weight or prompt change generates a new hash and invalidates the previous DID, requiring rotation.</li>
        <li><strong>Deactivate:</strong> Instant revocation triggered manually or automatically by the Risk Engine if behaviors drift.</li>
      </ul>
      
      <h3>5. Security & Privacy Considerations</h3>
      <p>Enforces strict signature verification, protects prompt IP via one-way hashes, and outlines Cloud KMS key-isolation patterns.</p>
    `
  }
];

async function patchIssues() {
  console.log('=== STARTING PATCHING OF STRATEGIC ISSUES IN PLANE ===\n');

  for (const update of updates) {
    const patchUrl = `${baseUrl}/api/v1/workspaces/${workspaceSlug}/projects/${projectId}/work-items/${update.issueId}/`;
    console.log(`PATCHing work item ${update.issueId} ("${update.name}")...`);
    
    try {
      const response = await fetch(patchUrl, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          name: update.name,
          description_html: update.description_html
        })
      });

      if (response.ok) {
        console.log(`  - Successfully updated work item description on Plane!`);
      } else {
        const errText = await response.text();
        console.error(`  - Failed to update (HTTP ${response.status}): ${errText}`);
      }
    } catch (err) {
      console.error(`  - Error patching issue:`, err.message);
    }
  }

  console.log('\n=== ALL PATCH OPERATIONS COMPLETED ===');
}

patchIssues();
