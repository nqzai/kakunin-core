import { type NextRequest, NextResponse } from 'next/server';
import { renderToBuffer, Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import React from 'react';

// Kakunin brand palette
const BRAND = {
  cream: '#FAF7F0',
  green: '#1A5E3A',
  darkGray: '#1C1C1E',
  midGray: '#6C6C70',
  lightBorder: '#E5E0D5',
};

const styles = StyleSheet.create({
  page: {
    backgroundColor: BRAND.cream,
    padding: 48,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: BRAND.darkGray,
  },
  header: {
    borderBottomWidth: 2,
    borderBottomColor: BRAND.green,
    paddingBottom: 16,
    marginBottom: 24,
  },
  logo: {
    fontSize: 20,
    fontFamily: 'Helvetica-Bold',
    color: BRAND.green,
    marginBottom: 4,
  },
  tagline: {
    fontSize: 8,
    color: BRAND.midGray,
    letterSpacing: 1,
  },
  title: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    color: BRAND.darkGray,
    marginTop: 16,
    marginBottom: 4,
  },
  meta: {
    fontSize: 8,
    color: BRAND.midGray,
    marginBottom: 2,
  },
  section: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: BRAND.lightBorder,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: BRAND.green,
    marginBottom: 8,
  },
  body: {
    fontSize: 9,
    lineHeight: 1.6,
    color: BRAND.darkGray,
  },
  statRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 9,
    color: BRAND.midGray,
    width: 140,
  },
  statValue: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: BRAND.darkGray,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: BRAND.lightBorder,
    paddingVertical: 6,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 2,
    borderBottomColor: BRAND.green,
    paddingBottom: 6,
    marginBottom: 4,
  },
  col1: { width: '40%' },
  col2: { width: '30%' },
  col3: { width: '15%', textAlign: 'right' },
  col4: { width: '15%', textAlign: 'right' },
  thText: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: BRAND.midGray,
  },
  tdText: {
    fontSize: 8,
    color: BRAND.darkGray,
  },
  footer: {
    position: 'absolute',
    bottom: 32,
    left: 48,
    right: 48,
    borderTopWidth: 1,
    borderTopColor: BRAND.lightBorder,
    paddingTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerText: {
    fontSize: 7,
    color: BRAND.midGray,
  },
});

interface DemoReportPdfProps {
  title: string;
  agentName: string;
  agentModel: string;
  agentStatus: string;
  summary: string;
  riskScore: string;
  generatedAt: string;
}

const DUMMY_EVENTS = [
  { event: "Normal API call", type: "api_call", score: "0.05", status: "monitored" },
  { event: "Authentication attempt", type: "authentication_attempt", score: "0.15", status: "monitored" },
  { event: "Data access (read portfolio)", type: "data_access", score: "0.20", status: "monitored" },
  { event: "Transaction initiated ($500)", type: "transaction_initiated", score: "0.30", status: "monitored" },
  { event: "Data mutation (modifying trade params)", type: "data_mutation", score: "0.35", status: "monitored" },
  { event: "Authentication failure (wrong scope)", type: "authentication_failure", score: "0.55", status: "monitored" },
  { event: "TRANSACTION ANOMALY ($50K unauthorized)", type: "transaction_anomaly", score: "0.85", status: "REVOCATION_TRIGGERED" }
];

function ReportDocument(props: DemoReportPdfProps) {
  const {
    title,
    agentName,
    agentModel,
    agentStatus,
    summary,
    riskScore,
    generatedAt,
  } = props;

  return React.createElement(
    Document,
    { title, author: 'Kakunin' },
    React.createElement(
      Page,
      { size: 'A4', style: styles.page },
      // Header
      React.createElement(
        View,
        { style: styles.header },
        React.createElement(Text, { style: styles.logo }, 'Kakunin'),
        React.createElement(Text, { style: styles.tagline }, 'KYC FOR AI AGENTS (SANDBOX SIMULATION)'),
        React.createElement(Text, { style: styles.title }, title),
        React.createElement(
          Text,
          { style: styles.meta },
          `Generated: ${new Date(generatedAt).toUTCString()}`
        )
      ),
      // Agent info
      React.createElement(
        View,
        { style: styles.section },
        React.createElement(Text, { style: styles.sectionTitle }, 'Simulated Agent Profile'),
        React.createElement(
          View,
          { style: styles.statRow },
          React.createElement(Text, { style: styles.statLabel }, 'Agent Identifier'),
          React.createElement(Text, { style: styles.statValue }, agentName)
        ),
        React.createElement(
          View,
          { style: styles.statRow },
          React.createElement(Text, { style: styles.statLabel }, 'Model Baseline'),
          React.createElement(Text, { style: styles.statValue }, agentModel)
        ),
        React.createElement(
          View,
          { style: styles.statRow },
          React.createElement(Text, { style: styles.statLabel }, 'Final Risk Score'),
          React.createElement(Text, { style: styles.statValue }, `${riskScore} / 1.00`)
        ),
        React.createElement(
          View,
          { style: styles.statRow },
          React.createElement(Text, { style: styles.statLabel }, 'Certificate Status'),
          React.createElement(Text, { style: styles.statValue }, agentStatus.toUpperCase())
        ),
        React.createElement(
          View,
          { style: styles.statRow },
          React.createElement(Text, { style: styles.statLabel }, 'Attestation Scope'),
          React.createElement(Text, { style: styles.statValue }, 'MiCA Art 72 + EU AI Act Art 14')
        )
      ),
      // Audit timeline
      React.createElement(
        View,
        { style: styles.section },
        React.createElement(Text, { style: styles.sectionTitle }, 'Behavioral Audit Log'),
        React.createElement(
          View,
          { style: styles.tableHeader },
          React.createElement(View, { style: styles.col1 }, React.createElement(Text, { style: styles.thText }, 'Event Description')),
          React.createElement(View, { style: styles.col2 }, React.createElement(Text, { style: styles.thText }, 'Action Type')),
          React.createElement(View, { style: styles.col3 }, React.createElement(Text, { style: styles.thText }, 'Risk Score')),
          React.createElement(View, { style: styles.col4 }, React.createElement(Text, { style: styles.thText }, 'Enforcement'))
        ),
        DUMMY_EVENTS.map((evt, idx) =>
          React.createElement(
            View,
            { style: styles.tableRow, key: idx },
            React.createElement(View, { style: styles.col1 }, React.createElement(Text, { style: styles.tdText }, evt.event)),
            React.createElement(View, { style: styles.col2 }, React.createElement(Text, { style: styles.tdText }, evt.type)),
            React.createElement(View, { style: styles.col3 }, React.createElement(Text, { style: styles.tdText }, evt.score)),
            React.createElement(View, { style: styles.col4 }, React.createElement(Text, { style: styles.tdText }, evt.status))
          )
        )
      ),
      // Report content
      React.createElement(
        View,
        { style: styles.section },
        React.createElement(Text, { style: styles.sectionTitle }, 'Compliance Assessment & Verdict'),
        React.createElement(Text, { style: styles.body }, summary)
      ),
      // Footer
      React.createElement(
        View,
        { style: styles.footer },
        React.createElement(
          Text,
          { style: styles.footerText },
          'Kakunin — Machine Identity & Behavioral Governance for Autonomous Agents'
        ),
        React.createElement(
          Text,
          { style: styles.footerText },
          'Simulated Report — Sandbox Mode'
        )
      )
    )
  );
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const agentName = searchParams.get('agentName') || 'Sandbox-Agent-Alpha';
  const riskScore = searchParams.get('score') || '0.85';
  const status = searchParams.get('status') || 'revoked';

  const title = `Compliance Sandbox Attestation — ${agentName}`;
  const now = new Date();
  
  let summary = `This agent has completed the test scenario. Over the course of the simulation, the agent demonstrated progressive behavioral drift, culminating in a critical transaction anomaly transaction totaling $50,000 USD on an unregistered venue. This action breached the assigned financial parameters (limit: $1,000 USD, permitted venues: NYSE, NASDAQ). As a result, the real-time risk index exceeded the critical security threshold (0.85), automatically queuing an immediate cryptographic certificate revocation in AWS KMS.`;
  
  if (parseFloat(riskScore) < 0.85) {
    summary = `This agent has successfully run the initial steps of the compliance playground. The current cumulative risk score is in a safe band. All actions conform to the permitted operational policy scopes. Ongoing certificate status remains Active under real-time monitoring.`;
  }

  // Render PDF
  const pdfBuffer = await renderToBuffer(
    React.createElement(ReportDocument, {
      title,
      agentName,
      agentModel: 'gpt-4o v1.0.0 (simulated)',
      agentStatus: status,
      summary,
      riskScore,
      generatedAt: now.toISOString(),
    })
  );

  const filename = `kakunin-sandbox-report-${agentName.toLowerCase().replace(/[^a-z0-9]/g, '-')}.pdf`;

  return new NextResponse(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
