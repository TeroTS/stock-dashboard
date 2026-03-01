import { CandlestickChart } from './CandlestickChart'
import type { StockCardModel } from '../types'

interface StockCardProps {
  card: StockCardModel
}

export function StockCard({ card }: StockCardProps) {
  return (
    <article className="stock-card">
      <header className="stock-card-header">
        <span className="stock-symbol">{card.symbol}</span>

        <div className="range-list">
          {card.timeRanges.map((range) => (
            <button
              key={`${card.symbol}-${range}`}
              className={`range-chip ${range === card.activeRange ? 'range-chip-active' : ''}`}
              type="button"
            >
              {range}
            </button>
          ))}
        </div>
      </header>

      <section className="chart-area">
        <div className="chart-main">
          <div className="y-axis">
            {card.yAxisLabels.map((label) => (
              <span key={`${card.symbol}-${label}`} className="axis-text">
                {label}
              </span>
            ))}
          </div>

          <CandlestickChart candles={card.candles} gridLines={card.gridLines} />
        </div>

        <div className="x-axis">
          {card.xAxisLabels.map((label, index) => (
            <span key={`${card.symbol}-${label}-${index}`} className="axis-text">
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
