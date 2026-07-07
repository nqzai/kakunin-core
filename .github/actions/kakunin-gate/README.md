# Kakunin Cert Gate — GitHub Action

Block a deployment when an AI agent's recent **behavioral risk** is too high,
and revoke its certificate automatically on a hard fail. Dev-native, self-serve:
add one step to your workflow, store a Kakunin API key as a secret.

## Verdict bands

| Peak risk over window | Verdict | Effect |
|-----------------------|---------|--------|
| `< 0.75` | `pass` | Deploy proceeds |
| `0.75 – 0.85` | `action_required` | Warning annotation; deploy proceeds (unless `fail-on-action-required: true`) |
| `≥ 0.85` | `fail` | Job fails **and** the agent's active certificate is revoked + agent suspended |

The score is the **peak** `risk_score` over `window-days` — one high-risk event
can block a deploy.

## Usage

```yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Kakunin cert gate
        uses: ./.github/actions/kakunin-gate   # or your-org/kakunin-gate@v1 once published
        with:
          api-key: ${{ secrets.KAKUNIN_API_KEY }}
          agent-id: 550e8400-e29b-41d4-a716-446655440000
          # optional:
          # api-url: https://kakunin.ai
          # window-days: '7'
          # fail-on-action-required: 'false'

      - name: Deploy
        run: ./deploy.sh   # only runs if the gate did not fail the job
```

## Inputs

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `api-key` | yes | — | Kakunin API key (GitHub secret). |
| `agent-id` | yes | — | UUID of the agent to gate on. |
| `api-url` | no | `https://kakunin.ai` | Kakunin API base URL. |
| `window-days` | no | `7` | Days of behavioral history to evaluate (1–30). |
| `fail-on-action-required` | no | `false` | Also fail the job on `action_required`. |

## Outputs

| Output | Description |
|--------|-------------|
| `decision` | `pass` \| `action_required` \| `fail` |
| `risk-score` | Peak risk score considered |
| `cert-revoked` | `true` if the cert was revoked by this gate |

## Audit trail

Every gate check writes a Kakunin `audit_log` row tagged with the commit SHA,
workflow run id, and repository — so any deploy is traceable to the exact risk
posture that allowed (or blocked) it. A hard fail writes a
`certificate.revoked`-class event.

## Requirements

The runner needs `curl` and `jq` (both preinstalled on GitHub-hosted runners).
