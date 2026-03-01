export interface PlotShape {
  x: number
  y: number
  width: number
  height: number
  fill: string
}

export interface CandleSpec {
  index: number
  body: PlotShape
  wick: PlotShape
}

export interface GridLineSpec {
  x: number
  y: number
  width: number
  height: number
}

export interface StockCardModel {
  symbol: string
  timeRanges: string[]
  activeRange: string
  yAxisLabelsByRange: Record<string, string[]>
  xAxisLabelsByRange: Record<string, string[]>
  gridLines: GridLineSpec[]
  candlesByRange: Record<string, CandleSpec[]>
  buyLabel: string
  shortLabel: string
}
