import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { StockDashboard } from '../StockDashboard.tsx'
import type { StockCardModel, TransactionCardModel } from '../../types.ts'

const topGainers: StockCardModel[] = [
  {
    symbol: 'AAPL',
    close: 211.32,
    officialOpenPrice: 208.5,
    percentChange: 1.35,
    points: [
      { timestamp: 1784054638000, close: 211.18 },
      { timestamp: 1784054639000, close: 211.32 },
    ],
  },
]

const topLosers: StockCardModel[] = [
  {
    symbol: 'TSLA',
    close: 172.44,
    officialOpenPrice: 176,
    percentChange: -2.02,
    points: [
      { timestamp: 1784054638000, close: 172.7 },
      { timestamp: 1784054639000, close: 172.44 },
    ],
  },
]

const mockTransactions: TransactionCardModel[] = [
  {
    transactionId: 'tx-pending',
    symbol: 'MSFT',
    positionType: 'LONG',
    status: 'PENDING_OPEN',
    submittedAt: 1784054638400,
    openedAt: null,
    closedAt: null,
    entryPrice: null,
    exitPrice: null,
    profitLoss: null,
    points: [{ timestamp: 1784054638000, close: 303 }],
  },
  {
    transactionId: 'tx-open',
    symbol: 'AAPL',
    positionType: 'LONG',
    status: 'OPEN',
    submittedAt: 1784054638500,
    openedAt: 1784054639000,
    closedAt: null,
    entryPrice: 211.32,
    exitPrice: null,
    profitLoss: null,
    points: [{ timestamp: 1784054639000, close: 211.32 }],
  },
]

const openTransaction = vi.fn()
const closeTransaction = vi.fn()
const cancelOpenTransaction = vi.fn()
let mockStatus: 'connected' | 'live' | 'reconnecting' | 'fallback' = 'live'
let mockUpdatedAt: number | null = 1784054639000

vi.mock('../../live/useDashboardFeed', () => ({
  useDashboardFeed: () => ({
    topGainers,
    topLosers,
    transactions: mockTransactions,
    status: mockStatus,
    updatedAt: mockUpdatedAt,
    openTransaction,
    closeTransaction,
    cancelOpenTransaction,
  }),
}))

describe('StockDashboard', () => {
  beforeEach(() => {
    mockStatus = 'live'
    mockUpdatedAt = 1784054639000
    openTransaction.mockClear()
    closeTransaction.mockClear()
    cancelOpenTransaction.mockClear()
  })

  it('renders live sections from the feed hook', () => {
    render(<StockDashboard />)

    expect(screen.getByText('Top Gainers')).toBeInTheDocument()
    expect(screen.getByText('Top Losers')).toBeInTheDocument()
    expect(screen.getByText('Transactions')).toBeInTheDocument()
    expect(screen.getAllByText('AAPL').length).toBeGreaterThan(0)
    expect(screen.getByText('TSLA')).toBeInTheDocument()
    expect(screen.getByText('+1.35%')).toBeInTheDocument()
    expect(screen.getByText('-2.02%')).toBeInTheDocument()
  })

  it('renders connection status and timestamp', () => {
    render(<StockDashboard />)

    expect(screen.getByText('Live')).toBeInTheDocument()
    expect(screen.getByText(/Updated: 2026-07-14 18:43:59 UTC/)).toBeInTheDocument()
  })

  it('renders connected waiting text before the first eligible snapshot', () => {
    mockStatus = 'connected'
    mockUpdatedAt = null

    render(<StockDashboard />)

    expect(screen.getByText('Connected')).toHaveClass('dashboard-status-connected')
    expect(screen.getByText('Updated: Waiting for eligible market data')).toBeInTheDocument()
  })

  it('calls open close and cancel transaction actions from buttons', () => {
    render(<StockDashboard />)

    fireEvent.click(screen.getByRole('button', { name: 'Buy AAPL' }))
    fireEvent.click(screen.getByRole('button', { name: 'Sell AAPL' }))
    fireEvent.click(screen.getByRole('button', { name: 'Cancel MSFT' }))

    expect(openTransaction).toHaveBeenCalledWith('AAPL', 'LONG')
    expect(closeTransaction).toHaveBeenCalledWith('tx-open')
    expect(cancelOpenTransaction).toHaveBeenCalledWith('tx-pending')
  })
})
