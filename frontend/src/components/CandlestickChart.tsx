import type { CandleSpec, GridLineSpec } from '../types'

const PLOT_BASE_WIDTH = 271.2
const PLOT_BASE_HEIGHT = 313

function toPercent(value: number, max: number): string {
  return `${(value / max) * 100}%`
}

interface CandlestickChartProps {
  candles: CandleSpec[]
  gridLines: GridLineSpec[]
  referenceLines?: ChartReferenceLine[]
}

interface ChartReferenceLine {
  key: string
  topPercent: number
  className: string
}

export function CandlestickChart({ candles, gridLines, referenceLines = [] }: CandlestickChartProps) {
  return (
    <div className="candlestick-plot">
      {gridLines.map((line, index) => (
        <span
          key={`line-${index}`}
          className="chart-grid-line"
          style={{
            left: toPercent(line.x, PLOT_BASE_WIDTH),
            top: toPercent(line.y, PLOT_BASE_HEIGHT),
            width: toPercent(line.width, PLOT_BASE_WIDTH),
            height: toPercent(line.height, PLOT_BASE_HEIGHT),
          }}
        />
      ))}

      {candles.map((candle) => (
        <span
          key={`wick-${candle.index}`}
          className="wick"
          style={{
            left: toPercent(candle.wick.x, PLOT_BASE_WIDTH),
            top: toPercent(candle.wick.y, PLOT_BASE_HEIGHT),
            width: toPercent(candle.wick.width, PLOT_BASE_WIDTH),
            height: toPercent(candle.wick.height, PLOT_BASE_HEIGHT),
          }}
        />
      ))}

      {candles.map((candle) => (
        <span
          key={`body-${candle.index}`}
          className="body"
          style={{
            left: toPercent(candle.body.x, PLOT_BASE_WIDTH),
            top: toPercent(candle.body.y, PLOT_BASE_HEIGHT),
            width: toPercent(candle.body.width, PLOT_BASE_WIDTH),
            height: toPercent(candle.body.height, PLOT_BASE_HEIGHT),
            background: candle.body.fill,
          }}
        />
      ))}

      {referenceLines.map((line) => (
        <span
          key={line.key}
          className={`chart-reference-line ${line.className}`}
          style={{ top: `${line.topPercent}%` }}
        />
      ))}
    </div>
  )
}
