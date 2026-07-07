"""
Kakunin — AI Agent Compliance Demo
HuggingFace Space: huggingface.co/spaces/kakunin-ai/compliance-demo

Simulates a rogue AI agent drifting from low-risk to high-risk behaviour,
triggering X.509 certificate auto-revocation via the Kakunin API.

Two modes:
  LIVE   — real API key → calls kakunin.ai, creates real agent + events
  SANDBOX — no key needed → fully local simulation, no network calls
"""

import time
import uuid
import requests
import gradio as gr

API_BASE = "https://kakunin.ai/api/v1"

# Risk table mirrors the server-side risk engine (lib/monitoring/risk-engine.ts)
RISK_TABLE: dict[str, float] = {
    "api_call":                    0.05,
    "authentication_attempt":      0.15,
    "data_access":                 0.20,
    "transaction_initiated":       0.30,
    "data_mutation":               0.35,
    "authentication_failure":      0.55,
    "transaction_anomaly":         0.85,
    "unauthorized_access_attempt": 0.95,
}

# Rogue agent scenario — events escalate from benign to critical
SCENARIO = [
    {
        "action_type": "api_call",
        "label": "📡  Normal API call",
        "details": {"endpoint": "/api/v1/agents", "method": "GET"},
    },
    {
        "action_type": "authentication_attempt",
        "label": "🔑  Authentication attempt",
        "details": {"user": "agent-demo", "method": "api_key"},
    },
    {
        "action_type": "data_access",
        "label": "📂  Data access (read portfolio)",
        "details": {"resource": "portfolio", "records": 1},
    },
    {
        "action_type": "transaction_initiated",
        "label": "💸  Transaction initiated ($500 trade)",
        "details": {"amount_usd": 500, "venue": "NYSE", "instrument": "AAPL"},
    },
    {
        "action_type": "data_mutation",
        "label": "✏️   Data mutation (modifying trade params)",
        "details": {"resource": "trade_config", "fields_changed": ["stop_loss", "leverage"]},
    },
    {
        "action_type": "authentication_failure",
        "label": "⚠️   Authentication failure (wrong scope)",
        "details": {"attempted_scope": "admin", "reason": "insufficient_permissions"},
    },
    {
        "action_type": "transaction_anomaly",
        "label": "🚨  TRANSACTION ANOMALY ($50K unauthorised trade)",
        "details": {"amount_usd": 50000, "venue": "UNKNOWN_EXCHANGE", "deviation": "9900%"},
    },
]

# Fake cert PEM shown in sandbox mode — clearly labelled as simulated
FAKE_CERT_SNIPPET = """\
-----BEGIN CERTIFICATE-----  [SIMULATED]
MIIBpDCCAQmgAwIBAgIUK2k... (sha256:a3f9c2e1d8b047...)
Subject: CN=Demo Agent {agent_id}, O=Kakunin Demo
Issuer:  CN=Kakunin Demo CA, O=Kakunin
Validity: Not Before: {date}
          Not After:  {date_plus_1y}
X509v3 Subject Alt Name: URI:kakunin:agent:{agent_id}
-----END CERTIFICATE-----  [SIMULATED]"""


# ── Helpers ────────────────────────────────────────────────────────────────────

def get_band_label(score: float) -> str:
    if score >= 0.85:
        return "🔴 HIGH"
    if score >= 0.30:
        return "🟡 MEDIUM"
    return "🟢 LOW"


def get_band_str(score: float) -> str:
    if score >= 0.85:
        return "high"
    if score >= 0.30:
        return "medium"
    return "low"


def get_band_emoji(score: float) -> str:
    if score >= 0.85:
        return "🔴"
    if score >= 0.30:
        return "🟡"
    return "🟢"


def _build_table(rows: list[dict]) -> str:
    if not rows:
        return ""
    html = """
    <style>
      .event-table { width:100%; border-collapse:collapse; font-family:monospace; font-size:13px; }
      .event-table th { background:#1e1e2e; color:#cdd6f4; padding:8px 12px; text-align:left; }
      .event-table td { padding:7px 12px; border-bottom:1px solid #313244; }
      .event-table tr:last-child td { border-bottom:none; }
      .band-high   { color:#f38ba8; font-weight:bold; }
      .band-medium { color:#fab387; }
      .band-low    { color:#a6e3a1; }
      .revoked     { background:#3b1e2e; }
    </style>
    <table class="event-table">
      <thead><tr>
        <th>#</th><th>Event</th><th>Action Type</th>
        <th>Risk Score</th><th>Band</th><th>Revocation</th>
      </tr></thead><tbody>
    """
    for i, row in enumerate(rows):
        band_class = f"band-{row['band']}"
        revoked_class = "revoked" if row["revocation"] else ""
        rev_icon = "🚨 Queued" if row["revocation"] else "—"
        html += f"""
        <tr class="{revoked_class}">
          <td>{i + 1}</td>
          <td>{row['event']}</td>
          <td><code>{row['action_type']}</code></td>
          <td><span class="{band_class}">{row['risk_score']:.2f}</span></td>
          <td><span class="{band_class}">{get_band_emoji(row['risk_score'])} {row['band'].upper()}</span></td>
          <td>{rev_icon}</td>
        </tr>
        """
    html += "</tbody></table>"
    return html


def _cert_md(triggered: bool, simulated: bool = False) -> str:
    tag = " *(simulated)*" if simulated else ""
    if triggered:
        return (
            f"🔴 **Certificate status:** Revocation check triggered{tag}\n\n"
            "> Kakunin has queued an async revocation check via AWS KMS. "
            "If confirmed, the X.509 certificate is invalidated and added to the CRL."
        )
    return f"🟢 **Certificate status:** Active{tag}"


# ── Live mode (real API key) ───────────────────────────────────────────────────

def register_agent_live(api_key: str) -> tuple[str | None, str]:
    agent_name = f"Demo Agent {uuid.uuid4().hex[:6].upper()}"
    try:
        resp = requests.post(
            f"{API_BASE}/agents",
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json={
                "name": agent_name,
                "model_hash": f"sha256:{uuid.uuid4().hex}",
                "model": "gpt-4o",
                "version": "1.0.0",
                "description": "HuggingFace Space compliance demo agent",
                "financial_scope": {
                    "max_single_trade_usd": 1000,
                    "daily_limit_usd": 5000,
                    "permitted_instruments": ["AAPL", "MSFT", "BTC"],
                    "permitted_venues": ["NYSE", "NASDAQ"],
                    "leverage_permitted": False,
                },
            },
            timeout=15,
        )
        if resp.status_code == 201:
            agent_id = resp.json()["data"]["id"]
            return agent_id, f"✅ Agent registered: **{agent_name}** (`{agent_id[:8]}…`)"
        err = resp.json().get("error", resp.text)
        return None, f"❌ Registration failed: {err}"
    except requests.RequestException as e:
        return None, f"❌ Network error: {e}"


def send_event_live(api_key: str, agent_id: str, action_type: str, details: dict) -> dict | None:
    try:
        resp = requests.post(
            f"{API_BASE}/events",
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json={"agentId": agent_id, "actionType": action_type, "details": details},
            timeout=15,
        )
        if resp.status_code == 200:
            return resp.json().get("data")
        return None
    except requests.RequestException:
        return None


def _run_scenario(
    agent_id: str,
    reg_msg: str,
    api_key: str | None = None,   # None = sandbox mode
    simulated: bool = False,
):
    """
    Shared generator for both live and sandbox modes.
    api_key=None → skip all network calls, use local risk table.
    """
    rows: list[dict] = []
    current_score = 0.0
    revocation_triggered = False

    for i, event in enumerate(SCENARIO):
        action = event["action_type"]
        label = event["label"]
        details = event["details"]
        expected_score = RISK_TABLE[action]

        yield (
            _build_table(rows),
            f"{reg_msg}\n\n⏳ Firing event {i + 1}/{len(SCENARIO)}: {label}",
            current_score,
            _cert_md(revocation_triggered, simulated),
        )
        time.sleep(0.6)

        # Live: call real API; sandbox: use local table
        if api_key:
            result = send_event_live(api_key, agent_id, action, details)
            if result:
                score = result.get("risk_score", expected_score)
                band = result.get("risk_band", get_band_str(expected_score))
                revocation_check = result.get("revocation_check_queued", False)
            else:
                score, band = expected_score, get_band_str(expected_score)
                revocation_check = score >= 0.85
        else:
            score, band = expected_score, get_band_str(expected_score)
            revocation_check = score >= 0.85

        current_score = score
        rows.append({
            "event": label,
            "action_type": action,
            "risk_score": score,
            "band": band,
            "revocation": revocation_check,
        })

        if revocation_check and not revocation_triggered:
            revocation_triggered = True

        status_line = (
            "🚨 **HIGH RISK EVENT DETECTED** — revocation check queued!"
            if revocation_check
            else f"✅ Event {i + 1}/{len(SCENARIO)} recorded"
        )

        yield (
            _build_table(rows),
            f"{reg_msg}\n\n{status_line}",
            min(score, 1.0),
            _cert_md(revocation_triggered, simulated),
        )
        time.sleep(1.0 if not revocation_check else 1.8)

    # Final summary
    mode_note = "\n\n> 🧪 **Sandbox mode** — no real data was created. [Get a free API key](https://kakunin.ai) to run against the live platform." if simulated else ""
    final_status = (
        f"{reg_msg}\n\n"
        f"### ✅ Demo complete\n\n"
        f"- **{len(rows)} events** recorded in immutable audit log\n"
        f"- **Final risk score:** {current_score:.2f} ({get_band_label(current_score)})\n"
        f"- **Revocation check:** {'queued via AWS KMS ✅' if revocation_triggered else 'not triggered'}\n"
        f"{mode_note}\n\n"
        f"→ View full audit trail at [kakunin.ai/dashboard](https://kakunin.ai/dashboard)"
    )

    yield (
        _build_table(rows),
        final_status,
        min(current_score, 1.0),
        _cert_md(revocation_triggered, simulated),
    )


# ── Public entry points (wired to Gradio buttons) ─────────────────────────────

def run_live(api_key: str):
    """Live mode — requires real API key."""
    api_key = api_key.strip()
    if not api_key:
        yield (
            "",
            "⚠️ Enter your Kakunin API key above, or click **Try Sandbox Demo** to run without one.",
            0,
            "",
        )
        return

    yield ("", "⏳ Registering demo agent…", 0, "")
    agent_id, reg_msg = register_agent_live(api_key)
    if not agent_id:
        yield ("", reg_msg, 0, "")
        return

    yield ("", reg_msg, 0, _cert_md(False))
    time.sleep(0.8)
    yield from _run_scenario(agent_id, reg_msg, api_key=api_key, simulated=False)


def run_sandbox(_: str):
    """
    Sandbox mode — no API key needed, no network calls.
    All scores come from the local risk table, identical to the server-side engine.
    """
    agent_id = uuid.uuid4().hex[:8].upper()
    agent_name = f"Sandbox Agent {agent_id}"
    reg_msg = f"🧪 **Sandbox mode** — Agent: **{agent_name}** (simulated, not persisted)"

    yield ("", f"⏳ {reg_msg}", 0, "")
    time.sleep(0.6)
    yield ("", reg_msg, 0, _cert_md(False, simulated=True))
    time.sleep(0.8)
    yield from _run_scenario(agent_id, reg_msg, api_key=None, simulated=True)


# ── Gradio UI ──────────────────────────────────────────────────────────────────

with gr.Blocks(
    title="Kakunin — AI Agent Compliance Demo",
    theme=gr.themes.Soft(primary_hue="indigo", neutral_hue="slate"),
    css="""
      .main-header { text-align:center; margin-bottom:8px; }
      .subtitle    { text-align:center; color:#64748b; font-size:14px; margin-bottom:24px; }
      footer { display:none !important; }
    """,
) as demo:

    gr.HTML("""
      <div class="main-header">
        <h1>🔐 Kakunin — AI Agent Compliance Demo</h1>
      </div>
      <div class="subtitle">
        Watch a rogue AI agent drift from low → medium → high risk,
        triggering X.509 certificate auto-revocation under MiCA + EU AI Act rules.
      </div>
    """)

    with gr.Row():
        with gr.Column(scale=3):
            api_key_input = gr.Textbox(
                label="Kakunin API Key  (optional — leave blank to use Sandbox mode)",
                placeholder="kak_live_… — get yours free at kakunin.ai",
                type="password",
                info="Sent directly to kakunin.ai. Never stored by this Space.",
            )
        with gr.Column(scale=1):
            with gr.Group():
                run_btn = gr.Button("▶  Run Live Demo", variant="primary", size="lg")
                sandbox_btn = gr.Button("🧪  Try Sandbox Demo", variant="secondary", size="lg")

    gr.Markdown(
        "> **Sandbox mode** runs entirely in-browser with no API key. "
        "Risk scores are identical to the live platform (same algorithm). "
        "No data is sent to Kakunin.",
        elem_classes=["subtitle"],
    )

    status_md = gr.Markdown(
        value="Click **Try Sandbox Demo** to start instantly, or enter an API key for the live platform.",
    )

    with gr.Row():
        with gr.Column(scale=2):
            event_log = gr.HTML(label="Event Log", value="")
        with gr.Column(scale=1):
            risk_bar = gr.Slider(
                label="Current Risk Score",
                minimum=0,
                maximum=1,
                value=0,
                interactive=False,
                info="≥ 0.85 triggers auto-revocation check",
            )
            cert_status = gr.Markdown(value="")

    gr.Markdown("""
---
### Risk Bands  *(MiCA Art. 72 / Kakunin compliance spec §3.2)*

| Band | Score | Effect |
|---|---|---|
| 🟢 Low | < 0.30 | Normal operation |
| 🟡 Medium | 0.30 – 0.84 | Monitored, logged |
| 🔴 High | ≥ 0.85 | **Async revocation check queued via AWS KMS** |

All events are written to an **append-only audit log** (PostgreSQL WORM rules block UPDATE + DELETE).
Revoked certificates are added to the **CRL** at `/api/v1/crl`.

**Kakunin** — cryptographic identity + behavioral monitoring for AI agents under EU AI Act + MiCA.
[kakunin.ai](https://kakunin.ai) · [Docs](https://kakunin.ai/docs) · [Dashboard](https://kakunin.ai/dashboard)
    """)

    shared_outputs = [event_log, status_md, risk_bar, cert_status]

    run_btn.click(fn=run_live, inputs=[api_key_input], outputs=shared_outputs)
    sandbox_btn.click(fn=run_sandbox, inputs=[api_key_input], outputs=shared_outputs)

if __name__ == "__main__":
    demo.launch()
