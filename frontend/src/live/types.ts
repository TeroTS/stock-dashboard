export interface CandleSnapshotDto {
  bucketStart: string
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export interface StockCardSnapshotDto {
  symbol: string
  percentChange: number
  timeRanges: string[]
  activeRange: string
  candlesByRange: Record<string, CandleSnapshotDto[]>
  yAxisLabels: string[]
  xAxisLabels: string[]
  buyLabel: string
  shortLabel: string
}

export interface DashboardSnapshotDto {
  generatedAt: string
  sessionState: string
  topGainers: StockCardSnapshotDto[]
  topLosers: StockCardSnapshotDto[]
}

export type LiveConnectionStatus = 'live' | 'reconnecting' | 'fallback'
