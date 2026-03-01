import { CandlestickChart } from './CandlestickChart'
import type { StockCardModel } from '../types'
import { useState } from 'react'

interface StockCardProps {
  card: StockCardModel
}

export function StockCard({ card }: StockCardProps) {
  const [selectedRange, setSelectedRange] = useState<string | null>(null)

  const activeRange =
    selectedRange !== null && card.timeRanges.includes(selectedRange) ? selectedRange : card.activeRange
  const candles = card.candlesByRange[activeRange] ?? []
  const yAxisLabels = card.yAxisLabelsByRange[activeRange] ?? []
  const xAxisLabels = card.xAxisLabelsByRange[activeRange] ?? []

  return (
    <article className="stock-card">
      <header className="stock-card-header">
        <span className="stock-symbol">{card.symbol}</span>

        <div className="range-list">
          {card.timeRanges.map((range) => (
            <button
              key={`${card.symbol}-${range}`}
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
              <span key={`${card.symbol}-${label}`} className="axis-text">
                {label}
              </span>
            ))}
          </div>

          <CandlestickChart candles={candles} gridLines={card.gridLines} />
        </div>

        <div className="x-axis">
          {xAxisLabels.map((label) => (
            <span key={`${card.symbol}-${activeRange}-${label}`} className="axis-text">
              {label}
            </span>
          ))}
        </div>
      </section>

      <footer className="card-footer">
        <button className="trade-button trade-button-buy" type="button">
          {card.buyLabel}
        </button>
        <button className="trade-button trade-button-short" type="button">
          {card.shortLabel}
        </button>
      </footer>
    </article>
  )
}
