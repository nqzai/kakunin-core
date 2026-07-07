---
title: Kakunin — AI Agent Compliance Demo
emoji: 🔐
colorFrom: indigo
colorTo: purple
sdk: gradio
sdk_version: 4.44.0
app_file: app.py
pinned: true
license: mit
short_description: Watch a rogue AI agent get caught and cert-revoked in real time
---

# Kakunin — AI Agent Compliance Demo

**Kakunin** issues X.509 certificates to AI agents, monitors behavioral events in real time, and generates MiCA + EU AI Act compliance reports via API.

## What this demo shows

1. Register an AI agent with a cryptographic identity
2. Simulate escalating rogue behavior (low → medium → high risk events)
3. Watch the risk score cross the **0.85 threshold**
4. See the auto-revocation check trigger automatically

## API

Base URL: `https://kakunin.ai/api/v1`  
Auth: `Authorization: Bearer <your_api_key>`

Get a free API key at [kakunin.ai](https://kakunin.ai)
