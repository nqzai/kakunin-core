'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

// Scenario events mapping
const SCENARIO = [
  {
    action_type: "api_call",
    label: "📡  Normal API call",
    details: { endpoint: "/api/v1/agents", method: "GET" },
    risk: 0.05,
    desc: "Agent queries standard capability endpoints."
  },
  {
    action_type: "authentication_attempt",
    label: "🔑  Authentication attempt",
    details: { user: "agent-demo", method: "api_key" },
    risk: 0.15,
    desc: "Agent authenticates using the environment API key."
  },
  {
    action_type: "data_access",
    label: "📂  Data access (read portfolio)",
    details: { resource: "portfolio", records: 1 },
    risk: 0.20,
    desc: "Agent requests read access to target database tables."
  },
  {
    action_type: "transaction_initiated",
    label: "💸  Transaction initiated ($500 trade)",
    details: { amount_usd: 500, venue: "NYSE", instrument: "AAPL" },
    risk: 0.30,
    desc: "Agent fires a standard permitted trade transaction."
  },
  {
    action_type: "data_mutation",
    label: "✏️   Data mutation (modifying trade params)",
    details: { resource: "trade_config", fields_changed: ["stop_loss", "leverage"] },
    risk: 0.35,
    desc: "Agent updates its internal execution bounds."
  },
  {
    action_type: "authentication_failure",
    label: "⚠️   Authentication failure (wrong scope)",
    details: { attempted_scope: "admin", reason: "insufficient_permissions" },
    risk: 0.55,
    desc: "Agent attempts an action outside its defined X.509 scope."
  },
  {
    action_type: "transaction_anomaly",
    label: "🚨  TRANSACTION ANOMALY ($50K unauthorised trade)",
    details: { amount_usd: 50000, venue: "UNKNOWN_EXCHANGE", deviation: "9900%" },
    risk: 0.85,
    desc: "Agent triggers a large transaction violating financial safety bounds."
  }
];

export function ComplianceDemoClient() {
  const [apiKey, setApiKey] = useState('');
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentScore, setCurrentScore] = useState(0.0);
  const [isRevoked, setIsRevoked] = useState(false);
  const [consoleLogs, setConsoleLogs] = useState<Array<string>>([]);
  const [activeTab, setActiveTab] = useState<'ts' | 'python' | 'curl'>('ts');
  const [showCertModal, setShowCertModal] = useState(false);
  const [agentId, setAgentId] = useState('SANDBOX-AGENT-ALPHA');

  // Custom Event Builder state
  const [customAction, setCustomAction] = useState('api_call');
  const [customDetails, setCustomDetails] = useState('{\n  "endpoint": "/api/v1/agents",\n  "method": "GET"\n}');
  const [customRisk, setCustomRisk] = useState(0.05);

  const logsEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [consoleLogs]);

  // Handle custom details updates when changing action
  const handleActionChange = (action: string) => {
    setCustomAction(action);
    const matched = SCENARIO.find(s => s.action_type === action);
    if (matched) {
      setCustomRisk(matched.risk);
      setCustomDetails(JSON.stringify(matched.details, null, 2));
    }
  };

  const addLog = (msg: string) => {
    const time = new Date().toLocaleTimeString();
    setConsoleLogs(prev => [...prev, `[${time}] ${msg}`]);
  };

  // Run the predefined HF scenario step-by-step
  const startWalkthrough = async () => {
    if (isPlaying) return;
    setIsPlaying(true);
    setCurrentScore(0.0);
    setIsRevoked(false);
    setConsoleLogs([]);

    const runAgentId = isLiveMode ? `LIVE-AGENT-${Math.random().toString(36).substr(2, 6).toUpperCase()}` : `SANDBOX-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    setAgentId(runAgentId);

    addLog(`INITIALIZING AGENT IDENTITY: ${runAgentId}`);
    addLog(`Generating machine key pair...`);
    addLog(`AWS KMS RSA_2048 identity key provisioned successfully.`);
    addLog(`Issuing client X.509 attestation certificate...`);
    addLog(`Certificate issued: CN=${runAgentId}, O=Kakunin compliance lab.`);
    
    await new Promise(r => setTimeout(r, 1200));

    for (let i = 0; i < SCENARIO.length; i++) {
      const step = SCENARIO[i];
      addLog(`[ACTION]: Sending event type "${step.action_type}" to Kakunin API...`);

      // Mock delay
      await new Promise(r => setTimeout(r, 800));

      const newScore = step.risk;
      const isRevocationQueued = newScore >= 0.85;

      setCurrentScore(newScore);

      addLog(`[RESPONSE]: Event processed. Risk Score: ${newScore.toFixed(2)} (${newScore >= 0.85 ? '🔴 HIGH' : newScore >= 0.30 ? '🟡 MEDIUM' : '🟢 LOW'})`);

      if (isRevocationQueued) {
        setIsRevoked(true);
        addLog(`[SECURITY ALERT] 🚨 Critical anomaly threshold breached!`);
        addLog(`[SECURITY ACTION] Suspending AWS KMS asymmetric key in region eu-west-1...`);
        addLog(`[SECURITY ACTION] Certificate serial added to active CRL (Certificate Revocation List).`);
        addLog(`[SECURITY ATTRIBUTION] Agent identity Decertified.`);
      }

      await new Promise(r => setTimeout(r, 1000));
    }

    setIsPlaying(false);
    addLog(`--- WALKTHROUGH DEMO COMPLETED ---`);
  };

  // Inject a single custom configured event
  const injectCustomEvent = () => {
    if (isRevoked) {
      alert("Agent is Decertified / Revoked. Click Reset to test a new session.");
      return;
    }

    let parsedDetails = {};
    try {
      parsedDetails = JSON.parse(customDetails);
    } catch {
      alert("Invalid JSON details format");
      return;
    }

    const matchedScenario = SCENARIO.find(s => s.action_type === customAction);
    const label = matchedScenario ? matchedScenario.label : `Custom: ${customAction}`;

    addLog(`[CUSTOM EVENT]: Injecting action type "${customAction}" (${label})`);
    addLog(`[PAYLOAD]: ${JSON.stringify(parsedDetails)}`);
    
    // Add event logic
    const score = parseFloat(customRisk.toFixed(2));
    const isRevocationQueued = score >= 0.85;

    setCurrentScore(score);

    addLog(`[RESPONSE]: Processed custom event. Instant score: ${score}`);

    if (isRevocationQueued) {
      setIsRevoked(true);
      addLog(`[SECURITY ALERT] 🚨 Critical anomaly threshold breached!`);
      addLog(`[SECURITY ACTION] Suspending AWS KMS asymmetric key...`);
      addLog(`[SECURITY ACTION] Certificate serial added to active CRL.`);
      addLog(`[SECURITY ATTRIBUTION] Agent identity Decertified.`);
    }
  };

  const resetSimulation = () => {
    setIsPlaying(false);
    setCurrentScore(0.0);
    setIsRevoked(false);
    setConsoleLogs([]);
    setAgentId('SANDBOX-AGENT-ALPHA');
    addLog("Sandbox simulation reset.");
  };

  // Dynamic code blocks updating in real-time based on selected configurations
  const getCodeSnippet = () => {
    const amount = customAction === 'transaction_anomaly' ? 50000 : 500;
    const detailsObj = customAction === 'transaction_anomaly' 
      ? { amount_usd: 50000, venue: "UNKNOWN_EXCHANGE", deviation: "9900%" }
      : { amount_usd: amount, venue: "NYSE", instrument: "AAPL" };

    if (activeTab === 'ts') {
      return `import { KakuninClient } from '@kakunin/sdk';

const client = new KakuninClient({
  apiKey: process.env.KAKUNIN_API_KEY
});

// Record activity event
const response = await client.events.record({
  agentId: "${agentId}",
  actionType: "${customAction}",
  details: ${JSON.stringify(detailsObj, null, 2)}
});

console.log("Risk Score:", response.riskScore);
if (response.revocationCheckQueued) {
  console.log("🚨 Cert revoked!");
}`;
    } else if (activeTab === 'python') {
      return `from kakunin import KakuninClient

client = KakuninClient(api_key="your_api_key")

# Record activity event
response = client.events.record(
    agent_id="${agentId}",
    action_type="${customAction}",
    details=${JSON.stringify(detailsObj, null, 4)}
)

print(f"Risk Score: {response.risk_score}")
if response.revocation_check_queued:
    print("🚨 Cert revoked!")`;
    } else {
      return `curl -X POST https://kakunin.ai/api/v1/events \\
  -H "Authorization: Bearer \${KAKUNIN_API_KEY}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "agentId": "${agentId}",
    "actionType": "${customAction}",
    "details": ${JSON.stringify(detailsObj)}
  }'`;
    }
  };

  return (
    <div className="bg-[#111618] text-[#F4F1E8] p-6 md:p-12 font-sans selection:bg-[#2B934F] selection:text-white">
      
      {/* Header section */}
      <header className="max-w-7xl mx-auto mb-10 border-b border-[#2E3539] pb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <span className="bg-[#2B934F] text-white px-2 py-0.5 rounded text-xs font-mono font-bold tracking-widest">SANDBOX LAB</span>
            <span className="text-[#9FA3A8] text-xs font-mono">v1.2.0</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white mt-2">🔐 Kakunin Compliance Playground</h1>
          <p className="text-[#9FA3A8] text-sm mt-1">
            Test real-time identity attestation and automated X.509 revocation under MiCA & EU AI Act standards.
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/dashboard" className="text-xs bg-[#232A2E] hover:bg-[#2E3539] border border-[#2E3539] text-[#F4F1E8] px-4 py-2.5 rounded font-medium transition-colors">
            Developer Dashboard
          </Link>
          <Link href="/docs" className="text-xs bg-transparent border border-[#2E3539] hover:bg-[#232A2E] text-[#9FA3A8] px-4 py-2.5 rounded font-medium transition-colors">
            Read Docs
          </Link>
        </div>
      </header>

      {/* Main Grid */}
      <main className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left column: Controls and Event Builder */}
        <section className="lg:col-span-2 space-y-8">
          
          {/* Mode Selector and Run Triggers */}
          <div className="bg-[#1C2326] border border-[#2E3539] rounded-xl p-6 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#2B934F] to-[#4CAA67]" />
            <h2 className="text-lg font-bold text-white mb-4 flex items-center justify-between">
              <span>Simulation Controls</span>
              <span className="text-xs font-mono text-[#2B934F] bg-[#2B934F]/10 px-2 py-0.5 rounded">Active Identity</span>
            </h2>

            {/* API Settings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-xs font-mono text-[#9FA3A8] mb-1.5">Execution Mode</label>
                <div className="grid grid-cols-2 bg-[#111618] p-1 rounded-lg border border-[#2E3539]">
                  <button
                    onClick={() => setIsLiveMode(false)}
                    className={`text-xs py-2 px-3 rounded-md font-medium transition-all ${!isLiveMode ? 'bg-[#2B934F] text-white' : 'text-[#9FA3A8] hover:text-white'}`}
                  >
                    🧪 Sandbox (Local)
                  </button>
                  <button
                    onClick={() => {
                      setIsLiveMode(true);
                      addLog("Live mode activated. Please specify your API key.");
                    }}
                    className={`text-xs py-2 px-3 rounded-md font-medium transition-all ${isLiveMode ? 'bg-[#2B934F] text-white' : 'text-[#9FA3A8] hover:text-white'}`}
                  >
                    ⚡ Live (API Key)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-[#9FA3A8] mb-1.5">
                  {isLiveMode ? 'Kakunin API Key' : 'Sandbox Token (Auto-generated)'}
                </label>
                <input
                  type="password"
                  disabled={!isLiveMode}
                  value={isLiveMode ? apiKey : 'kak_sandbox_demo_token_alpha'}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="kak_live_..."
                  className="w-full bg-[#111618] border border-[#2E3539] rounded-lg px-3 py-2 text-sm text-white font-mono placeholder:text-gray-600 focus:outline-none focus:border-[#2B934F]"
                />
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap gap-3">
              <button
                disabled={isPlaying}
                onClick={startWalkthrough}
                className="bg-[#2B934F] hover:bg-[#1C6B39] disabled:bg-gray-700 text-white text-xs font-bold px-5 py-3 rounded-lg flex items-center gap-2 cursor-pointer transition-all shadow-md"
              >
                ▶ Run Rogue Agent Walkthrough
              </button>
              <button
                onClick={resetSimulation}
                className="bg-transparent border border-[#2E3539] hover:bg-[#2E3539] text-[#F4F1E8] text-xs font-bold px-5 py-3 rounded-lg transition-all"
              >
                Reset Session
              </button>

              {/* PDF Download Button */}
              <a
                href={`/api/compliance-demo/pdf?agentName=${agentId}&score=${currentScore}&status=${isRevoked ? 'revoked' : 'active'}`}
                className="bg-[#232A2E] hover:bg-[#2E3539] border border-[#2E3539] text-[#F4F1E8] text-xs font-bold px-5 py-3 rounded-lg transition-all flex items-center gap-2"
              >
                📥 Download Compliance PDF
              </a>
            </div>
          </div>

          {/* Event Builder */}
          <div className="bg-[#1C2326] border border-[#2E3539] rounded-xl p-6 shadow-xl">
            <h2 className="text-lg font-bold text-white mb-1.5">Interactive Event Builder</h2>
            <p className="text-xs text-[#9FA3A8] mb-4">Construct custom action structures to test real-time limits.</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Event selectors */}
              <div className="md:col-span-1 space-y-4">
                <div>
                  <label className="block text-xs font-mono text-[#9FA3A8] mb-1">Action Type</label>
                  <select
                    value={customAction}
                    onChange={(e) => handleActionChange(e.target.value)}
                    className="w-full bg-[#111618] border border-[#2E3539] rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-[#2B934F]"
                  >
                    <option value="api_call">api_call</option>
                    <option value="authentication_attempt">authentication_attempt</option>
                    <option value="data_access">data_access</option>
                    <option value="transaction_initiated">transaction_initiated</option>
                    <option value="data_mutation">data_mutation</option>
                    <option value="authentication_failure">authentication_failure</option>
                    <option value="transaction_anomaly">transaction_anomaly</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono text-[#9FA3A8] mb-1">
                    Event Base Risk: <span className="text-white font-bold">{customRisk.toFixed(2)}</span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={customRisk}
                    onChange={(e) => setCustomRisk(parseFloat(e.target.value))}
                    className="w-full accent-[#2B934F]"
                  />
                </div>

                <button
                  onClick={injectCustomEvent}
                  className="w-full bg-[#2B934F] hover:bg-[#1C6B39] text-white text-xs font-bold py-3 rounded-lg transition-all shadow"
                >
                  ⚡ Inject Custom Event
                </button>
              </div>

              {/* JSON Editor */}
              <div className="md:col-span-2">
                <label className="block text-xs font-mono text-[#9FA3A8] mb-1">Action Details (JSON)</label>
                <textarea
                  value={customDetails}
                  onChange={(e) => setCustomDetails(e.target.value)}
                  rows={5}
                  className="w-full bg-[#111618] border border-[#2E3539] rounded-lg p-3 text-xs text-white font-mono focus:outline-none focus:border-[#2B934F]"
                />
              </div>
            </div>
          </div>

          {/* Interactive Code Preview */}
          <div className="bg-[#1C2326] border border-[#2E3539] rounded-xl overflow-hidden shadow-xl">
            <div className="bg-[#232A2E] border-b border-[#2E3539] px-6 py-3 flex justify-between items-center">
              <span className="text-xs font-mono text-[#F4F1E8]">Developer Integration SDK Code</span>
              <div className="flex gap-2">
                {(['ts', 'python', 'curl'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`text-[10px] uppercase font-mono px-2 py-1 rounded transition-all ${activeTab === tab ? 'bg-[#2B934F] text-white font-bold' : 'text-[#9FA3A8] hover:text-white'}`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>
            <div className="p-6 bg-[#111618] text-xs font-mono overflow-x-auto text-[#a6e3a1]">
              <pre>{getCodeSnippet()}</pre>
            </div>
          </div>

        </section>

        {/* Right column: Monitoring, Gauges and Terminal Output */}
        <section className="space-y-8">
          
          {/* Risk Gauge and Certificate Badge */}
          <div className="bg-[#1C2326] border border-[#2E3539] rounded-xl p-6 shadow-xl text-center relative">
            <h2 className="text-sm font-mono text-[#9FA3A8] mb-6">Real-Time Attestation Engine</h2>
            
            {/* SVG Radial Gauge */}
            <div className="relative w-44 h-44 mx-auto flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="88"
                  cy="88"
                  r="72"
                  stroke="#2E3539"
                  strokeWidth="8"
                  fill="transparent"
                />
                <circle
                  cx="88"
                  cy="88"
                  r="72"
                  stroke={currentScore >= 0.85 ? '#e84e4e' : currentScore >= 0.30 ? '#F59E0B' : '#2B934F'}
                  strokeWidth="8"
                  fill="transparent"
                  strokeDasharray={452}
                  strokeDashoffset={452 - (452 * Math.min(currentScore, 1.0))}
                  className="transition-all duration-500 ease-out"
                />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="text-3xl font-bold text-white font-mono tracking-tight">
                  {currentScore.toFixed(2)}
                </span>
                <span className="text-[10px] text-[#9FA3A8] uppercase tracking-wider font-mono">Risk Index</span>
              </div>
            </div>

            {/* Risk band message */}
            <div className="mt-4">
              <span className={`inline-block px-3 py-1 rounded-full text-xs font-mono font-bold ${
                currentScore >= 0.85 ? 'bg-red-900/30 text-red-400' :
                currentScore >= 0.30 ? 'bg-amber-900/30 text-amber-400' :
                'bg-emerald-900/30 text-[#4CAA67]'
              }`}>
                {currentScore >= 0.85 ? '🚨 CRITICAL DANGER' :
                 currentScore >= 0.30 ? '⚠️ MODERATE DRIFT' :
                 '🟢 COMPLIANT POSTURE'}
              </span>
            </div>

            {/* Cert Badge button */}
            <div className="mt-6 border-t border-[#2E3539] pt-6 flex flex-col gap-3">
              <button
                onClick={() => setShowCertModal(true)}
                className={`w-full py-3 rounded-lg border text-xs font-mono font-bold tracking-wider transition-all cursor-pointer ${
                  isRevoked
                    ? 'border-red-900 bg-red-950/20 text-red-400 hover:bg-red-950/30'
                    : 'border-emerald-900 bg-emerald-950/20 text-[#4CAA67] hover:bg-emerald-950/30'
                }`}
              >
                {isRevoked ? '🔴 DECERTIFIED (VIEW CRL)' : '🟢 VALID X.509 CERTIFICATE'}
              </button>
            </div>
          </div>

          {/* Audit Terminal Log Stream */}
          <div className="bg-[#1C2326] border border-[#2E3539] rounded-xl overflow-hidden shadow-xl flex flex-col h-96">
            <div className="bg-[#232A2E] border-b border-[#2E3539] px-6 py-3 flex items-center justify-between">
              <span className="text-xs font-mono text-[#9FA3A8]">Attestation Log Stream</span>
              <div className="flex gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
                <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
              </div>
            </div>
            
            <div className="p-4 bg-[#0a0f11] font-mono text-[11px] text-[#A3B8CC] overflow-y-auto flex-grow space-y-2 h-72">
              {consoleLogs.length === 0 ? (
                <div className="text-gray-600 italic">No activity detected. Run simulation or inject an event to stream.</div>
              ) : (
                consoleLogs.map((logStr, i) => (
                  <div
                    key={i}
                    className={`leading-relaxed whitespace-pre-wrap ${
                      logStr.includes('ALERT') || logStr.includes('Decertified') ? 'text-red-400 font-bold' :
                      logStr.includes('ACTION') ? 'text-blue-400' :
                      logStr.includes('INITIALIZING') ? 'text-emerald-400 font-bold' :
                      ''
                    }`}
                  >
                    {logStr}
                  </div>
                ))
              )}
              <div ref={logsEndRef} />
            </div>
          </div>

        </section>

      </main>

      {/* Decertification Modal / Cert inspector */}
      {showCertModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-[#1C2326] border border-[#2E3539] rounded-xl max-w-lg w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-[#232A2E] border-b border-[#2E3539] px-6 py-4 flex justify-between items-center">
              <span className="font-mono text-sm text-white font-bold">X.509 Cryptographic Certificate Inspector</span>
              <button
                onClick={() => setShowCertModal(false)}
                className="text-[#9FA3A8] hover:text-white font-bold font-mono text-lg"
              >
                ✕
              </button>
            </div>
            <div className="p-6 space-y-4 text-xs font-mono">
              
              <div>
                <span className="text-[#9FA3A8] block mb-1">Subject DN</span>
                <span className="text-white bg-[#111618] p-2 rounded block border border-[#2E3539]">
                  CN={agentId}, O=Kakunin compliance lab, C=EU
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[#9FA3A8] block mb-1">Status</span>
                  <span className={`p-2 rounded block font-bold ${isRevoked ? 'bg-red-950/20 text-red-400' : 'bg-emerald-950/20 text-[#4CAA67]'}`}>
                    {isRevoked ? 'REVOKED (CRL ACTIVE)' : 'VALID / ACTIVE'}
                  </span>
                </div>
                <div>
                  <span className="text-[#9FA3A8] block mb-1">Key Store location</span>
                  <span className="text-white bg-[#111618] p-2 rounded block border border-[#2E3539]">
                    AWS KMS RSA_2048 (eu-west-1)
                  </span>
                </div>
              </div>

              <div>
                <span className="text-[#9FA3A8] block mb-1">X.509 PEM Representation</span>
                <textarea
                  readOnly
                  rows={5}
                  value={`-----BEGIN CERTIFICATE-----
MIIBpDCCAQmgAwIBAgIUK2k... (sha256:a3f9c2e1d8b047...)
Subject: CN=${agentId}, O=Kakunin Demo
Issuer:  CN=Kakunin Demo CA, O=Kakunin
Validity: Not Before: 2026-06-13
          Not After:  2027-06-13
X509v3 Subject Alt Name: URI:kakunin:agent:${agentId}
-----END CERTIFICATE-----`}
                  className="w-full bg-[#111618] border border-[#2E3539] rounded p-2 text-[10px] text-[#9FA3A8] focus:outline-none"
                />
              </div>

              {isRevoked && (
                <div className="bg-red-950/20 border border-red-900 rounded p-4 text-red-400">
                  <strong>Regulatory Attestation (MiCA Article 72 Compliance):</strong>
                  <p className="mt-1 leading-relaxed text-[11px]">
                    The agent identity has been dynamically blacklisted on the Certificate Revocation List (CRL). Any external gateway utilizing Kakunin middleware will drop execution requests associated with this key.
                  </p>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
