import { DASHBOARD_SUBTITLE, DASHBOARD_TITLE, STOCK_CARDS } from '../data/dashboardData'
import { StockCard } from './StockCard'

export function StockDashboard() {
  return (
    <main className="dashboard-page">
      <h1 className="dashboard-title">{DASHBOARD_TITLE}</h1>
      <p className="dashboard-subtitle">{DASHBOARD_SUBTITLE}</p>

      <section className="stock-grid">
        {STOCK_CARDS.map((card) => (
          <StockCard key={card.symbol} card={card} />
        ))}
      </section>
    </main>
  )
}
