import { DASHBOARD_SUBTITLE, DASHBOARD_TITLE } from '../data/dashboardData'
import { useDashboardFeed } from '../live/useDashboardFeed'
import { StockCard } from './StockCard'

function statusLabel(status: 'live' | 'reconnecting' | 'fallback'): string {
  if (status === 'live') {
    return 'Live'
  }

  if (status === 'reconnecting') {
    return 'Reconnecting'
  }

  return 'Fallback'
}

export function StockDashboard() {
  const { cards, status, updatedAt, sessionState } = useDashboardFeed()

  return (
    <main className="dashboard-page">
      <header className="dashboard-header">
        <h1 className="dashboard-title">{DASHBOARD_TITLE}</h1>
        <span className={`dashboard-status dashboard-status-${status}`}>{statusLabel(status)}</span>
      </header>
      <p className="dashboard-subtitle">{DASHBOARD_SUBTITLE}</p>
      <p className="dashboard-meta">
        Updated: {updatedAt ?? 'Waiting for live feed'} {sessionState ? `• Session: ${sessionState}` : ''}
      </p>

      <section className="stock-grid">
        {cards.map((card) => (
          <StockCard key={card.symbol} card={card} />
        ))}
      </section>
    </main>
  )
}
