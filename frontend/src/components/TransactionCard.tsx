import type { ReactNode } from 'react'
import type { LinePoint, TransactionCardModel } from '../types'
import { PriceChart, type PriceChartMarker } from './PriceChart'

interface TransactionCardProps {
  transaction: TransactionCardModel
  onClose?: (transactionId: string) => void
  onCancelOpen?: (transactionId: string) => void
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

interface TransactionAction {
  label: string
  onClick: () => void
}

function transactionAction(
  transaction: TransactionCardModel,
  onClose: ((transactionId: string) => void) | undefined,
  onCancelOpen: ((transactionId: string) => void) | undefined,
): TransactionAction | null {
  if (transaction.status === 'PENDING_OPEN') {
    return {
      label: `Cancel ${transaction.symbol}`,
      onClick: () => onCancelOpen?.(transaction.transactionId),
    }
  }

  if (transaction.status === 'OPEN') {
    return {
      label: transaction.positionType === 'LONG' ? `Sell ${transaction.symbol}` : `Cover ${transaction.symbol}`,
      onClick: () => onClose?.(transaction.transactionId),
    }
  }

  return null
}

// Flat same-price updates can rewrite fill timestamps, so fall back to the first or last matching close.
function markerPointIndex(
  points: LinePoint[],
  timestamp: number,
  close: number,
  tone: PriceChartMarker['tone'],
): number | null {
  let fallbackIndex: number | null = null

  for (const [index, point] of points.entries()) {
    if (point.timestamp === timestamp && point.close === close) {
      return index
    }

    if (point.close !== close) {
      continue
    }

    if (tone === 'entry') {
      fallbackIndex ??= index
    } else {
      fallbackIndex = index
    }
  }

  return fallbackIndex
}

function chartMarkers(transaction: TransactionCardModel): PriceChartMarker[] {
  const markers: PriceChartMarker[] = []

  if (transaction.openedAt !== null && transaction.entryPrice !== null) {
    const entryPointIndex = markerPointIndex(
      transaction.points,
      transaction.openedAt,
      transaction.entryPrice,
      'entry',
    )

    if (entryPointIndex !== null) {
      markers.push({
        key: `${transaction.transactionId}-entry`,
        pointIndex: entryPointIndex,
        tone: 'entry',
      })
    }
  }

  if (transaction.closedAt !== null && transaction.exitPrice !== null) {
    const exitPointIndex = markerPointIndex(
      transaction.points,
      transaction.closedAt,
      transaction.exitPrice,
      'exit',
    )

    if (exitPointIndex !== null) {
      markers.push({
        key: `${transaction.transactionId}-exit`,
        pointIndex: exitPointIndex,
        tone: 'exit',
      })
    }
  }

  return markers
}

export function TransactionCard({ transaction, onClose, onCancelOpen }: TransactionCardProps): ReactNode {
  const action = transactionAction(transaction, onClose, onCancelOpen)

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
          <p className={`transaction-profit-header ${profitLossClassName(transaction.profitLoss)}`}>
            {formatProfitLoss(transaction.profitLoss)}
          </p>
        </div>
      </header>

      <div className="stock-card-chart">
        <PriceChart
          symbol={transaction.symbol}
          points={transaction.points}
          markers={chartMarkers(transaction)}
          testId={`transaction-chart-${transaction.transactionId}`}
        />
      </div>

      {action ? (
        <footer className="transaction-footer">
          <button className="trade-button transaction-close-button" type="button" onClick={action.onClick}>
            {action.label}
          </button>
        </footer>
      ) : null}
    </article>
  )
}
