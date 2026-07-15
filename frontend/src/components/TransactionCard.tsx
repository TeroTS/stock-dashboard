import type { TransactionCardModel } from '../types'

interface TransactionCardProps {
  transaction: TransactionCardModel
  onClose?: (transactionId: string) => void
}

function formatPrice(value: number | null): string {
  return value === null ? '-' : value.toFixed(2)
}

function formatProfitLoss(value: number | null): string {
  if (value === null) {
    return '-'
  }
  return `${value > 0 ? '+' : ''}${value.toFixed(2)}`
}

function profitLossClassName(value: number | null): string {
  if (value === null) {
    return 'transaction-profit-neutral'
  }

  if (value > 0) {
    return 'transaction-profit-positive'
  }

  if (value < 0) {
    return 'transaction-profit-negative'
  }

  return 'transaction-profit-neutral'
}

// Open transactions are the only ones that still expose a user action in the current contract.
function closeLabel(transaction: TransactionCardModel): string | null {
  if (transaction.status !== 'OPEN') {
    return null
  }
  return transaction.positionType === 'LONG' ? `Sell ${transaction.symbol}` : `Cover ${transaction.symbol}`
}

export function TransactionCard({ transaction, onClose }: TransactionCardProps) {
  const actionLabel = closeLabel(transaction)
  const isClosed = transaction.status === 'CLOSED'

  return (
    <article className="transaction-card" data-testid={`transaction-${transaction.transactionId}`}>
      <header className="transaction-card-header">
        <div className="transaction-title-block">
          <p className="transaction-symbol">{transaction.symbol}</p>
          <p className="transaction-open-time">Status: {transaction.status}</p>
        </div>
        <div className="transaction-header-right">
          <span className={`transaction-position-badge transaction-position-${transaction.positionType.toLowerCase()}`}>
            {transaction.positionType}
          </span>
          {isClosed ? (
            <p className={`transaction-profit-header ${profitLossClassName(transaction.profitLoss)}`}>
              {formatProfitLoss(transaction.profitLoss)}
            </p>
          ) : null}
        </div>
      </header>

      <section className="transaction-values">
        <p className="transaction-line">Entry: {formatPrice(transaction.entryPrice)}</p>
        <p className="transaction-line">Exit: {formatPrice(transaction.exitPrice)}</p>
        {isClosed ? null : <p className="transaction-line">P/L: {formatProfitLoss(transaction.profitLoss)}</p>}
        <p className="transaction-line">Points: {transaction.points.length}</p>
      </section>

      {actionLabel ? (
        <footer className="transaction-footer">
          <button
            className="trade-button transaction-close-button"
            type="button"
            onClick={() => onClose?.(transaction.transactionId)}
          >
            {actionLabel}
          </button>
        </footer>
      ) : null}
    </article>
  )
}
