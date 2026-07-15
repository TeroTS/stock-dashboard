import type { StockCardModel } from '../types'

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

export function StockCard({ card, onBuy, onShort }: StockCardProps) {
  const latestPoint = card.points.at(-1)

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

      <section className="stock-values">
        <p className="stock-line">Close: {card.close.toFixed(2)}</p>
        <p className="stock-line">Open: {card.officialOpenPrice.toFixed(2)}</p>
        <p className="stock-line">Points: {card.points.length}</p>
        {latestPoint ? <p className="stock-line">Latest tick: {latestPoint.close.toFixed(2)}</p> : null}
      </section>

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
