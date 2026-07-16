import type { PositionType, TransactionStatus } from '../types'

export interface DashboardSnapshotPointDto {
  timestamp: number
  close: number
}

export interface DashboardSnapshotStockDto {
  symbol: string
  close: number
  officialOpenPrice: number
  percentChange: number
  points: DashboardSnapshotPointDto[]
}

export interface DashboardSnapshotTransactionDto {
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
  points: DashboardSnapshotPointDto[]
}

export interface DashboardSnapshotDto {
  updatedAt: number
  topGainers: DashboardSnapshotStockDto[]
  topLosers: DashboardSnapshotStockDto[]
  transactions: DashboardSnapshotTransactionDto[]
}

export type LiveConnectionStatus = 'connected' | 'live' | 'reconnecting' | 'fallback'
