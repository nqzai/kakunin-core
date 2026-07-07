export default function DashboardLoading() {
  return (
    <main className="dash-inner" aria-busy="true" aria-live="polite">
      <div className="dash-inner-head">
        <div style={{ width: '100%' }}>
          <div className="skel skel-line-lg" style={{ width: 220, height: 18, marginBottom: 10 }} />
          <div className="skel skel-line-sm" style={{ width: 360, height: 10 }} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '20px' }}>
        {[0, 1, 2, 3].map((card) => (
          <div
            key={card}
            style={{
              background: 'var(--card)',
              border: '1px solid var(--hairline)',
              borderRadius: 'var(--r-md)',
              padding: '18px',
              minHeight: '132px',
            }}
          >
            <div className="skel skel-line-xs" style={{ width: 90, marginBottom: 16 }} />
            <div className="skel skel-line-lg" style={{ width: 120, height: 24, marginBottom: 14 }} />
            <div className="skel skel-line-sm" style={{ width: 140, marginBottom: 18 }} />
            <div className="skel" style={{ height: 28, width: '100%' }} />
          </div>
        ))}
      </div>

      <div className="agents-table-wrap">
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--paper-edge)', background: 'var(--paper)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 0.7fr 1fr 0.8fr 0.8fr 0.8fr 0.5fr', gap: '12px' }}>
            {[110, 70, 90, 60, 70, 80, 40].map((width, index) => (
              <div key={index} className="skel skel-line-xs" style={{ width }} />
            ))}
          </div>
        </div>

        {[0, 1, 2, 3, 4, 5].map((row) => (
          <div key={row} className="skel-row">
            <div className="skel skel-avatar" />
            <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1.4fr 0.7fr 1fr 0.8fr 0.8fr 0.8fr 0.5fr', gap: '12px', alignItems: 'center' }}>
              <div className="skel skel-line-lg" style={{ width: row % 2 === 0 ? 150 : 120 }} />
              <div className="skel skel-pill" style={{ width: 72 }} />
              <div className="skel skel-line-sm" style={{ width: row % 2 === 0 ? 110 : 95 }} />
              <div className="skel skel-pill" style={{ width: 64 }} />
              <div className="skel skel-line-xs" style={{ width: 68 }} />
              <div className="skel skel-line-xs" style={{ width: 82 }} />
              <div className="skel skel-badge" style={{ width: 56 }} />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
