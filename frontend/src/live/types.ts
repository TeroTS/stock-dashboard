import type { StockCardModel, TransactionCardModel } from '../types'

export interface DashboardSnapshotDto {
  updatedAt: number
  topGainers: StockCardModel[]
  topLosers: StockCardModel[]
  transactions: TransactionCardModel[]
}

export type LiveConnectionStatus = 'live' | 'reconnecting' | 'fallback'
