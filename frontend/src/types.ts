export interface LinePoint {
  timestamp: number
  close: number
}

export interface StockCardModel {
  symbol: string
  close: number
  officialOpenPrice: number
  percentChange: number
  points: LinePoint[]
}

export type PositionType = 'LONG' | 'SHORT'
export type TransactionStatus = 'PENDING_OPEN' | 'OPEN' | 'PENDING_CLOSE' | 'CLOSED'

export interface TransactionCardModel {
  transactionId: string
  symbol: string
  positionType: PositionType
  status: TransactionStatus
  submittedAt: number
  openedAt: number | null
  closedAt: number | null
  entryPrice: number | null
  exitPrice: number | null
  profitLoss: number | null
  points: LinePoint[]
}
