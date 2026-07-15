import type { ReactNode } from 'react'
import type { LinePoint } from '../types'

export interface PriceChartMarker {
  key: string
  pointIndex: number
  tone: 'entry' | 'exit'
}

interface PriceChartProps {
  symbol: string
  points: LinePoint[]
  markers?: PriceChartMarker[]
  testId: string
}

interface ChartPosition {
  key: string
  x1: string
  x2: string
  cy: string
}

const CHART_WIDTH = 100
const CHART_HEIGHT = 40
const CHART_MAX_DASH_WIDTH = 2
const CHART_MIN_DASH_WIDTH = 0.5
function formatCoordinate(value: number): string {
  return Number(value.toFixed(2)).toString()
}

function chartDashWidth(pointCount: number): number {
  if (pointCount <= 1) {
    return CHART_MAX_DASH_WIDTH
  }

  const pointSpacing = CHART_WIDTH / (pointCount - 1)

  return Math.max(CHART_MIN_DASH_WIDTH, Math.min(CHART_MAX_DASH_WIDTH, pointSpacing * 0.6))
}

function chartPositions(points: LinePoint[]): ChartPosition[] {
  if (points.length === 0) {
    return []
  }

  const dashWidth = chartDashWidth(points.length)
  const dashHalfWidth = dashWidth / 2

  if (points.length === 1) {
    const [point] = points
    const x1 = (CHART_WIDTH - dashWidth) / 2

    return [
      {
        key: `${point.timestamp}-0`,
        x1: formatCoordinate(x1),
        x2: formatCoordinate(x1 + dashWidth),
        cy: formatCoordinate(CHART_HEIGHT / 2),
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
      cy: formatCoordinate(y),
    }
  })
}

export function PriceChart({ symbol, points, markers = [], testId }: PriceChartProps): ReactNode {
  const positions = chartPositions(points)

  if (positions.length === 0) {
    return null
  }

  return (
    <svg
      aria-label={`${symbol} price chart`}
      className="stock-chart"
      data-testid={testId}
      preserveAspectRatio="none"
      viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
    >
      {positions.map((position) => (
        <line
          key={position.key}
          className="stock-chart-dash"
          vectorEffect="non-scaling-stroke"
          x1={position.x1}
          x2={position.x2}
          y1={position.cy}
          y2={position.cy}
        />
      ))}
      {markers.map((marker) => {
        const position = positions[marker.pointIndex]

        if (position === undefined) {
          return null
        }

        return (
          <line
            key={marker.key}
            className={`price-chart-marker-dash price-chart-marker-${marker.tone}`}
            vectorEffect="non-scaling-stroke"
            x1={position.x1}
            x2={position.x2}
            y1={position.cy}
            y2={position.cy}
          />
        )
      })}
    </svg>
  )
}
