import { type NextRequest, NextResponse } from 'next/server';
import { requireTenantId } from '@/lib/gateway/tenant-context';
import { createServiceClient } from '@/lib/supabase/server';
import { renderToBuffer, Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import React from 'react';

/**
 * GET /v1/reports/:id/pdf
 *
 * Returns a branded PDF of a completed compliance report.
 * Returns 404 if report not found, 425 if still generating.
 *
 * @react-pdf/renderer runs server-side — no browser APIs needed.
 */

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

interface ReportPdfProps {
  title: string;
  agentName: string;
  agentModel: string;
  agentStatus: string;
  periodStart: string;
  periodEnd: string;
  summary: string;
  generatedAt: string;
}

function ReportDocument(props: ReportPdfProps) {
  const {
    title,
    agentName,
    agentModel,
    agentStatus,
    periodStart,
    periodEnd,
    summary,
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
        React.createElement(Text, { style: styles.tagline }, 'KYC FOR AI AGENTS'),
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
        React.createElement(Text, { style: styles.sectionTitle }, 'Agent Details'),
        React.createElement(
          View,
          { style: styles.statRow },
          React.createElement(Text, { style: styles.statLabel }, 'Agent Name'),
          React.createElement(Text, { style: styles.statValue }, agentName)
        ),
        React.createElement(
          View,
          { style: styles.statRow },
          React.createElement(Text, { style: styles.statLabel }, 'Model'),
          React.createElement(Text, { style: styles.statValue }, agentModel)
        ),
        React.createElement(
          View,
          { style: styles.statRow },
          React.createElement(Text, { style: styles.statLabel }, 'Status'),
          React.createElement(Text, { style: styles.statValue }, agentStatus.toUpperCase())
        ),
        React.createElement(
          View,
          { style: styles.statRow },
          React.createElement(Text, { style: styles.statLabel }, 'Analysis Period'),
          React.createElement(
            Text,
            { style: styles.statValue },
            `${periodStart.slice(0, 10)} → ${periodEnd.slice(0, 10)}`
          )
        )
      ),
      // Report content
      React.createElement(
        View,
        { style: styles.section },
        React.createElement(Text, { style: styles.sectionTitle }, 'Compliance Analysis'),
        React.createElement(Text, { style: styles.body }, summary)
      ),
      // Footer
      React.createElement(
        View,
        { style: styles.footer },
        React.createElement(
          Text,
          { style: styles.footerText },
          'Kakunin — Cryptographic Identity & Compliance Infrastructure for AI Agents'
        ),
        React.createElement(
          Text,
          { style: styles.footerText },
          'Confidential — MiCA / EU AI Act compliant'
        )
      )
    )
  );
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const tenantAuth = requireTenantId(req);
  if (!tenantAuth.ok) return tenantAuth.response;
  const tenantId = tenantAuth.tenantId;
  const { id } = await params;
  const supabase = createServiceClient();

  // Fetch report — enforce tenant scope
  const { data: report, error: reportError } = await supabase
    .from('compliance_reports')
    .select('id, title, agent_id, summary, status, period_start, period_end, created_at')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single();

  if (reportError || !report) {
    return NextResponse.json({ error: 'Report not found' }, { status: 404 });
  }

  // 425 Too Early — report still being generated
  if (report.status === 'generating') {
    return NextResponse.json(
      { error: 'Report is still generating — retry in a few seconds' },
      { status: 425 }
    );
  }

  if (report.status === 'failed') {
    return NextResponse.json({ error: 'Report generation failed' }, { status: 500 });
  }

  if (!report.summary) {
    return NextResponse.json({ error: 'Report content unavailable' }, { status: 500 });
  }

  // Fetch agent details for the PDF
  const { data: agent } = await supabase
    .from('agents')
    .select('name, model, version, status')
    .eq('id', report.agent_id ?? '')
    .eq('tenant_id', tenantId)
    .maybeSingle();

  const agentName = agent?.name ?? 'Unknown Agent';
  const agentModel = agent ? `${agent.model} v${agent.version}` : 'Unknown';
  const agentStatus = agent?.status ?? 'unknown';

  // Render PDF — server-side, no browser APIs
  const pdfBuffer = await renderToBuffer(
    React.createElement(ReportDocument, {
      title: report.title,
      agentName,
      agentModel,
      agentStatus,
      periodStart: report.period_start,
      periodEnd: report.period_end,
      summary: report.summary,
      generatedAt: report.created_at,
    })
  );

  const filename = `kakunin-report-${id.slice(0, 8)}.pdf`;

  // Buffer → Uint8Array so NextResponse can accept it as BodyInit
  return new NextResponse(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      // Reports are sensitive — no CDN caching
      'Cache-Control': 'private, no-store',
    },
  });
}
