import { useState } from 'react'
import { CandlestickChart } from './CandlestickChart'
import type { TransactionCardModel } from '../types'

const PLOT_BASE_HEIGHT = 313
const VERTICAL_PADDING = 12

interface TransactionCardProps {
  transaction: TransactionCardModel
  onClose?: (transactionId: string) => void
}

const TIMESTAMP_FORMATTER = new Intl.DateTimeFormat('en-US', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
  timeZone: 'America/New_York',
})

function formatTimestamp(value: string): string {
  return TIMESTAMP_FORMATTER.format(new Date(value))
}

function formatPrice(value: number | null): string {
  if (value === null) {
    return '-'
  }

  return value.toFixed(2)
}

function formatProfitLoss(value: number | null): string {
  if (value === null) {
    return '-'
  }

  if (value > 0) {
    return `+${value.toFixed(2)}`
  }

  return value.toFixed(2)
}

function profitLossClass(value: number | null): string {
  if (value === null || value === 0) {
    return 'transaction-profit-neutral'
  }

  return value > 0 ? 'transaction-profit-positive' : 'transaction-profit-negative'
}

function toReferenceLineTopPercent(price: number, labels: string[]): number | null {
  const values = labels.map((label) => Number.parseFloat(label)).filter((value) => Number.isFinite(value))
  if (values.length < 2) {
    return null
  }

  const maxPrice = Math.max(...values)
  const minPrice = Math.min(...values)
  const range = Math.max(maxPrice - minPrice, 0.0001)
  const drawableHeight = PLOT_BASE_HEIGHT - VERTICAL_PADDING * 2
  const normalized = Math.min(1, Math.max(0, (maxPrice - price) / range))
  const y = VERTICAL_PADDING + normalized * drawableHeight

  return (y / PLOT_BASE_HEIGHT) * 100
}

export function TransactionCard({ transaction, onClose }: TransactionCardProps) {
  const [selectedRange, setSelectedRange] = useState<string | null>(null)
  const activeRange =
    selectedRange !== null && transaction.timeRanges.includes(selectedRange) ? selectedRange : transaction.activeRange
  const candles = transaction.candlesByRange[activeRange] ?? []
  const yAxisLabels = transaction.yAxisLabelsByRange[activeRange] ?? []
  const xAxisLabels = transaction.xAxisLabelsByRange[activeRange] ?? []
  const entryLineTop = toReferenceLineTopPercent(transaction.entryPrice, yAxisLabels)
  const exitLineTop = transaction.exitPrice !== null ? toReferenceLineTopPercent(transaction.exitPrice, yAxisLabels) : null

  const referenceLines = [
    ...(entryLineTop === null
      ? []
      : [{ key: `entry-${transaction.transactionId}`, topPercent: entryLineTop, className: 'chart-reference-line-entry' }]),
    ...(exitLineTop === null
      ? []
      : [{ key: `exit-${transaction.transactionId}`, topPercent: exitLineTop, className: 'chart-reference-line-exit' }]),
  ]

  return (
    <article className="transaction-card" data-testid={`transaction-${transaction.transactionId}`}>
      <header className="transaction-card-header">
        <div className="transaction-title-block">
          <p className="transaction-symbol">{transaction.symbol}</p>
          <p className="transaction-open-time">Opened {formatTimestamp(transaction.openTimestamp)}</p>
        </div>
        <div className="transaction-header-right">
          <span className={`transaction-position-badge transaction-position-${transaction.positionType.toLowerCase()}`}>
            {transaction.positionType}
          </span>
          <div className="range-list">
            {transaction.timeRanges.map((range) => (
              <button
                key={`${transaction.transactionId}-${range}`}
                className={`range-chip ${range === activeRange ? 'range-chip-active' : ''}`}
                type="button"
                onClick={() => setSelectedRange(range)}
              >
                {range}
              </button>
            ))}
          </div>
        </div>
      </header>

      <section className="chart-area">
        <div className="chart-main">
          <div className="y-axis">
            {yAxisLabels.map((label) => (
              <span key={`${transaction.transactionId}-${activeRange}-${label}`} className="axis-text">
                {label}
              </span>
            ))}
          </div>

          <CandlestickChart candles={candles} gridLines={transaction.gridLines} referenceLines={referenceLines} />
        </div>

        <div className="x-axis">
          {xAxisLabels.map((label) => (
            <span key={`${transaction.transactionId}-${activeRange}-${label}`} className="axis-text">
              {label}
            </span>
          ))}
        </div>
      </section>

      <section className="transaction-values">
        <p className="transaction-line">Entry: {formatPrice(transaction.entryPrice)}</p>
        <p className="transaction-line">Exit: {formatPrice(transaction.exitPrice)}</p>
        <p className={`transaction-line ${profitLossClass(transaction.profitLoss)}`}>
          P/L: {formatProfitLoss(transaction.profitLoss)}
        </p>
      </section>

      {transaction.status === 'OPEN' && transaction.closeActionLabel ? (
        <footer className="transaction-footer">
          <button className="trade-button transaction-close-button" type="button" onClick={() => onClose?.(transaction.transactionId)}>
            {transaction.closeActionLabel}
          </button>
        </footer>
      ) : null}
    </article>
  )
}
