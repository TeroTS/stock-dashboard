import { CandlestickChart } from './CandlestickChart'
import type { StockCardModel } from '../types'
import { useState } from 'react'

interface StockCardProps {
  card: StockCardModel
  onBuy?: () => void
  onShort?: () => void
}

function formatPercentChange(value: number): string {
  if (value > 0) {
    return `+${value.toFixed(2)}%`
  }
  return `${value.toFixed(2)}%`
}

function percentClassName(value: number): string {
  if (value > 0) {
    return 'stock-change-positive'
  }
  if (value < 0) {
    return 'stock-change-negative'
  }
  return 'stock-change-neutral'
}

export function StockCard({ card, onBuy, onShort }: StockCardProps) {
  const [selectedRange, setSelectedRange] = useState<string | null>(null)

  const activeRange =
    selectedRange !== null && card.timeRanges.includes(selectedRange) ? selectedRange : card.activeRange
  const candles = card.candlesByRange[activeRange] ?? []
  const yAxisLabels = card.yAxisLabelsByRange[activeRange] ?? []
  const xAxisLabels = card.xAxisLabelsByRange[activeRange] ?? []

  return (
    <article className="stock-card">
      <header className="stock-card-header">
        <div className="stock-symbol-group">
          <span className="stock-symbol">{card.symbol}</span>
          <span className={`stock-change ${percentClassName(card.percentChange)}`}>
            {formatPercentChange(card.percentChange)}
          </span>
        </div>

        <div className="range-list">
          {card.timeRanges.map((range) => (
            <button
              key={`${card.cardId}-${range}`}
              className={`range-chip ${range === activeRange ? 'range-chip-active' : ''}`}
              type="button"
              onClick={() => setSelectedRange(range)}
            >
              {range}
            </button>
          ))}
        </div>
      </header>

      <section className="chart-area">
        <div className="chart-main">
          <div className="y-axis">
            {yAxisLabels.map((label) => (
              <span key={`${card.cardId}-${label}`} className="axis-text">
                {label}
              </span>
            ))}
          </div>

          <CandlestickChart candles={candles} gridLines={card.gridLines} />
        </div>

        <div className="x-axis">
          {xAxisLabels.map((label) => (
            <span key={`${card.cardId}-${activeRange}-${label}`} className="axis-text">
              {label}
            </span>
          ))}
        </div>
      </section>

      <footer className="card-footer">
        <button className="trade-button trade-button-buy" type="button" onClick={onBuy}>
          {card.buyLabel}
        </button>
        <button className="trade-button trade-button-short" type="button" onClick={onShort}>
          {card.shortLabel}
        </button>
      </footer>
    </article>
  )
}
