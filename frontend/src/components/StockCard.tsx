import type { ReactNode } from 'react'
import type { LinePoint, StockCardModel } from '../types'

interface StockCardProps {
  card: StockCardModel
  onBuy?: () => void
  onShort?: () => void
}

const CHART_WIDTH = 100
const CHART_HEIGHT = 40
const CHART_MAX_DASH_WIDTH = 2
const CHART_MIN_DASH_WIDTH = 0.5

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

function formatCoordinate(value: number): string {
  return Number(value.toFixed(2)).toString()
}

interface ChartDash {
  key: string
  x1: string
  x2: string
  y: string
}

function chartDashWidth(pointCount: number): number {
  if (pointCount <= 1) {
    return CHART_MAX_DASH_WIDTH
  }

  const pointSpacing = CHART_WIDTH / (pointCount - 1)

  return Math.max(CHART_MIN_DASH_WIDTH, Math.min(CHART_MAX_DASH_WIDTH, pointSpacing * 0.6))
}

// Keep each marker narrower than the gap between points so dense charts do not merge into blobs.
function chartDashes(points: LinePoint[]): ChartDash[] {
  if (points.length === 0) {
    return []
  }

  const dashWidth = chartDashWidth(points.length)
  const dashHalfWidth = dashWidth / 2

  if (points.length === 1) {
    const x1 = (CHART_WIDTH - dashWidth) / 2

    return [
      {
        key: `${points[0]?.timestamp ?? 0}-0`,
        x1: formatCoordinate(x1),
        x2: formatCoordinate(x1 + dashWidth),
        y: formatCoordinate(CHART_HEIGHT / 2),
      },
    ]
  }

  const closes = points.map((point) => point.close)
  const minClose = Math.min(...closes)
  const maxClose = Math.max(...closes)
  const hasRange = maxClose > minClose

  return points.map((point, index) => {
    const x = (index / (points.length - 1)) * CHART_WIDTH
    const x1 = Math.max(0, Math.min(CHART_WIDTH - dashWidth, x - dashHalfWidth))
    const y = hasRange
      ? CHART_HEIGHT - ((point.close - minClose) / (maxClose - minClose)) * CHART_HEIGHT
      : CHART_HEIGHT / 2

    return {
      key: `${point.timestamp}-${index}`,
      x1: formatCoordinate(x1),
      x2: formatCoordinate(x1 + dashWidth),
      y: formatCoordinate(y),
    }
  })
}

export function StockCard({ card, onBuy, onShort }: StockCardProps): ReactNode {
  const dashes = chartDashes(card.points)

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
        {dashes.length > 0 ? (
          <svg
            aria-label={`${card.symbol} price chart`}
            className="stock-chart"
            data-testid={`stock-chart-${card.symbol}`}
            preserveAspectRatio="none"
            viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
          >
            {dashes.map((dash) => (
              <line
                key={dash.key}
                className="stock-chart-dash"
                vectorEffect="non-scaling-stroke"
                x1={dash.x1}
                x2={dash.x2}
                y1={dash.y}
                y2={dash.y}
              />
            ))}
          </svg>
        ) : null}
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
