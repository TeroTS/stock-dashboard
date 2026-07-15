import type { ReactNode } from 'react'
import type { StockCardModel } from '../types'
import { PriceChart } from './PriceChart'

interface StockCardProps {
  card: StockCardModel
  onBuy?: () => void
  onShort?: () => void
}

function formatPercentChange(value: number): string {
  return `${value > 0 ? '+' : ''}${value.toFixed(2)}%`
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

export function StockCard({ card, onBuy, onShort }: StockCardProps): ReactNode {
  return (
    <article className="stock-card" data-testid={`stock-${card.symbol}`}>
      <header className="stock-card-header">
        <div className="stock-symbol-group">
          <span className="stock-symbol">{card.symbol}</span>
          <span className={`stock-change ${percentClassName(card.percentChange)}`}>
            {formatPercentChange(card.percentChange)}
          </span>
        </div>
      </header>

      <div className="stock-card-chart">
        <PriceChart symbol={card.symbol} points={card.points} testId={`stock-chart-${card.symbol}`} />
      </div>

      <footer className="card-footer">
        <button
          aria-label={`Buy ${card.symbol}`}
          className="trade-button trade-button-buy"
          type="button"
          onClick={onBuy}
        >
          Buy
        </button>
        <button
          aria-label={`Short ${card.symbol}`}
          className="trade-button trade-button-short"
          type="button"
          onClick={onShort}
        >
          Short
        </button>
      </footer>
    </article>
  )
}
