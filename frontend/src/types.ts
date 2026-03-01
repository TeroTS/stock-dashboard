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
  yAxisLabels: string[]
  xAxisLabels: string[]
  gridLines: GridLineSpec[]
  candles: CandleSpec[]
  buyLabel: string
  shortLabel: string
}
