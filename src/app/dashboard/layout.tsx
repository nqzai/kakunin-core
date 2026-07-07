import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import {
  getDashboardOverviewData,
  getDashboardRequestContext,
  type DashboardRequestContext,
} from '@/lib/dashboard/server';
import { DashTopbar } from './_components/DashTopbar';
import { DashRailLeft } from './_components/DashRailLeft';
import { DashRailRight } from './_components/DashRailRight';
import { DebugChat } from './_components/DebugChat';
import { WebMCPProvider } from '@/components/WebMCPProvider';
import '@/app/landing.css';
import './dashboard.css';

export const metadata: Metadata = {
  title: 'Console — Kakunin',
  description: 'Kakunin operator console',
  robots: { index: false, follow: false },
};

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function DashRailLeftFallback({ context }: { context: DashboardRequestContext }) {
  return (
    <aside className="rail-left">
      <div className="profile-card">
        <div className="profile-banner" />
        <div className="profile-body">
          <div className="profile-avatar">{initials(context.userName)}</div>
          <div className="profile-name">{context.userName}</div>
          <div className="profile-role">Trust Operator · Issuer Admin</div>
          <div className="profile-org">{context.userEmail}</div>
          <div className="profile-tenant">
            <div className="tenant-mark">{initials(context.tenantName ?? 'T')}</div>
            <div className="shrink">
              <div style={{ fontWeight: 500 }}>{context.tenantName ?? 'My Tenant'}</div>
              <div style={{ fontFamily: 'var(--ff-mono)', fontSize: '10px', color: 'var(--ink-3)' }}>
                loading tenant overview…
              </div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}

function DashRailRightFallback() {
  return (
    <aside className="rail-right">
      <div className="signals-card">
        <div className="signals-head">
          <span className="sg-ttl">Trust signals</span>
          <span className="sg-info">i</span>
        </div>
        <div className="signals-sub">Loading console signals…</div>
      </div>
    </aside>
  );
}

async function DashboardLeftRail({ context }: { context: DashboardRequestContext }) {
  const overview = await getDashboardOverviewData(context.tenantId);

  return (
    <DashRailLeft
      userEmail={context.userEmail}
      userName={context.userName}
      tenantName={context.tenantName}
      alertCount={overview.alertCount}
      totalAgents={overview.totalAgents}
      activeCerts={overview.activeCerts}
      eventsToday={overview.eventsToday}
      activeAgents={overview.activeAgents}
    />
  );
}

async function DashboardRightRail({ context }: { context: DashboardRequestContext }) {
  const overview = await getDashboardOverviewData(context.tenantId);

  return (
    <DashRailRight
      alertCount={overview.alertCount}
      trustSignals={overview.trustSignals}
      activeCerts={overview.activeCerts}
      totalAgents={overview.totalAgents}
    />
  );
}

async function DashboardDebugChat({ tenantId }: { tenantId: string | null }) {
  const overview = await getDashboardOverviewData(tenantId);
  return <DebugChat enabled={overview.debugChatEnabled} />;
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const context = await getDashboardRequestContext();

  if (!context) {
    redirect('/login?next=/dashboard');
  }

  if (context.tenantId) {
    const planTier = context.planTier ?? 'pending';

    if (planTier === 'pending') {
      redirect('/signup/plan');
    }

    const isSuspendedPage = context.pathname === '/dashboard/suspended';
    if ((planTier === 'suspended' || planTier === 'cancelled') && !isSuspendedPage) {
      redirect('/dashboard/suspended');
    }
  }
  const userInitials = initials(context.userName);

  return (
    <>
      <DashTopbar userInitials={userInitials} />
      <div className="dash-shell">
        <Suspense fallback={<DashRailLeftFallback context={context} />}>
          <DashboardLeftRail context={context} />
        </Suspense>
        <div className="dash-col-center">
          {children}
        </div>
        <Suspense fallback={<DashRailRightFallback />}>
          <DashboardRightRail context={context} />
        </Suspense>
      </div>
      <Suspense fallback={null}>
        <DashboardDebugChat tenantId={context.tenantId} />
      </Suspense>
      <WebMCPProvider />
    </>
  );
}
