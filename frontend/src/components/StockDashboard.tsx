import { useDashboardFeed } from '../live/useDashboardFeed'
import { StockCard } from './StockCard'
import { TransactionCard } from './TransactionCard'

function statusLabel(status: 'connected' | 'live' | 'reconnecting' | 'fallback'): string {
  if (status === 'connected') {
    return 'Connected'
  }

  if (status === 'live') {
    return 'Live'
  }

  if (status === 'reconnecting') {
    return 'Reconnecting'
  }

  return 'Fallback'
}

// Show a stable UTC timestamp because snapshots already arrive as backend-owned epoch milliseconds.
function formatUpdatedAt(updatedAt: number | null): string {
  if (updatedAt === null) {
    return 'Waiting for eligible market data'
  }

  return new Date(updatedAt).toISOString().replace('T', ' ').replace('.000Z', ' UTC')
}

export function StockDashboard() {
  const {
    topGainers,
    topLosers,
    transactions,
    status,
    updatedAt,
    openTransaction,
    closeTransaction,
    cancelOpenTransaction,
  } = useDashboardFeed()
  const stockSections = [
    { key: 'gainer', title: 'Top Gainers', cards: topGainers },
    { key: 'loser', title: 'Top Losers', cards: topLosers },
  ]

  return (
    <main className="dashboard-page">
      <header className="dashboard-header">
        <h1 className="dashboard-title">Stock Dashboard</h1>
        <span className={`dashboard-status dashboard-status-${status}`}>{statusLabel(status)}</span>
      </header>
      <p className="dashboard-subtitle">Live watchlist snapshots from the backend WebSocket.</p>
      <p className="dashboard-meta">Updated: {formatUpdatedAt(updatedAt)}</p>

      {stockSections.map((section) => (
        <section key={section.key} className="transactions-section">
          <h2 className="transactions-title">{section.title}</h2>
          <div className="stock-grid">
            {section.cards.map((card) => (
              <StockCard
                key={`${section.key}-${card.symbol}`}
                card={card}
                onBuy={() => openTransaction(card.symbol, 'LONG')}
                onShort={() => openTransaction(card.symbol, 'SHORT')}
              />
            ))}
          </div>
        </section>
      ))}

      <section className="transactions-section">
        <h2 className="transactions-title">Transactions</h2>
        <div className="transactions-grid">
          {transactions.length === 0 ? (
            <p className="dashboard-meta">No transactions yet.</p>
          ) : (
            transactions.map((transaction) => (
              <TransactionCard
                key={transaction.transactionId}
                transaction={transaction}
                onClose={closeTransaction}
                onCancelOpen={cancelOpenTransaction}
              />
            ))
          )}
        </div>
      </section>
    </main>
  )
}
