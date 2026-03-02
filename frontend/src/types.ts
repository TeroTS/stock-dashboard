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
  cardId: string
  symbol: string
  percentChange: number
  timeRanges: string[]
  activeRange: string
  yAxisLabelsByRange: Record<string, string[]>
  xAxisLabelsByRange: Record<string, string[]>
  gridLines: GridLineSpec[]
  candlesByRange: Record<string, CandleSpec[]>
  buyLabel: string
  shortLabel: string
}

export type PositionType = 'LONG' | 'SHORT'
export type TransactionStatus = 'OPEN' | 'CLOSED'

export interface TransactionCardModel {
  transactionId: string
  symbol: string
  timeRanges: string[]
  activeRange: string
  yAxisLabelsByRange: Record<string, string[]>
  xAxisLabelsByRange: Record<string, string[]>
  gridLines: GridLineSpec[]
  candlesByRange: Record<string, CandleSpec[]>
  positionType: PositionType
  status: TransactionStatus
  openTimestamp: string
  closeTimestamp: string | null
  entryPrice: number
  exitPrice: number | null
  profitLoss: number | null
  closeActionLabel: string | null
}
