import { fireEvent, render, screen } from '@testing-library/react'
import { within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { StockDashboard } from './StockDashboard'
import type { StockCardModel } from '../types'
import type { TransactionCardModel } from '../types'

const mockCards: StockCardModel[] = [
  {
    cardId: 'gainer-AAPL',
    symbol: 'AAPL',
    percentChange: 2.1,
    timeRanges: ['5min', '30min', '120min'],
    activeRange: '5min',
    yAxisLabelsByRange: {
      '5min': ['10.00', '9.50', '9.00'],
      '30min': ['20.00', '19.50', '19.00'],
      '120min': ['30.00', '29.50', '29.00'],
    },
    xAxisLabelsByRange: {
      '5min': ['12:00'],
      '30min': ['11:00'],
      '120min': ['10:00'],
    },
    gridLines: [{ x: 1, y: 1, width: 1, height: 1 }],
    candlesByRange: {
      '5min': [
        {
          index: 1,
          body: { x: 1, y: 1, width: 1, height: 10, fill: '#22C55E' },
          wick: { x: 1, y: 1, width: 1, height: 15, fill: '#94A3B8' },
        },
      ],
      '30min': [
        {
          index: 1,
          body: { x: 2, y: 2, width: 1, height: 5, fill: '#EF4444' },
          wick: { x: 2, y: 2, width: 1, height: 8, fill: '#94A3B8' },
        },
      ],
      '120min': [],
    },
    buyLabel: 'Buy',
    shortLabel: 'Short',
  },
]

let mockCardsState: StockCardModel[] = [...mockCards]

const mockTransactions: TransactionCardModel[] = [
  {
    transactionId: 'tx-open',
    symbol: 'AAPL',
    timeRanges: ['5min', '30min', '120min'],
    activeRange: '5min',
    yAxisLabelsByRange: {
      '5min': ['26.00', '25.50', '25.00'],
      '30min': ['26.00', '25.50', '25.00'],
      '120min': ['26.00', '25.50', '25.00'],
    },
    xAxisLabelsByRange: {
      '5min': ['12:20'],
      '30min': ['12:20'],
      '120min': ['12:20'],
    },
    gridLines: [{ x: 1, y: 1, width: 1, height: 1 }],
    candlesByRange: {
      '5min': [
        {
          index: 1,
          body: { x: 1, y: 1, width: 1, height: 8, fill: '#22C55E' },
          wick: { x: 1, y: 1, width: 1, height: 12, fill: '#94A3B8' },
        },
      ],
      '30min': [],
      '120min': [],
    },
    positionType: 'LONG',
    status: 'OPEN',
    openTimestamp: '2026-03-01T12:20:00Z',
    closeTimestamp: null,
    entryPrice: 25,
    exitPrice: null,
    profitLoss: null,
    closeActionLabel: 'Sell',
  },
  {
    transactionId: 'tx-closed',
    symbol: 'MSFT',
    timeRanges: ['5min', '30min', '120min'],
    activeRange: '5min',
    yAxisLabelsByRange: {
      '5min': ['30.50', '29.25', '28.00'],
      '30min': ['30.50', '29.25', '28.00'],
      '120min': ['30.50', '29.25', '28.00'],
    },
    xAxisLabelsByRange: {
      '5min': ['12:10'],
      '30min': ['12:10'],
      '120min': ['12:10'],
    },
    gridLines: [{ x: 1, y: 1, width: 1, height: 1 }],
    candlesByRange: {
      '5min': [
        {
          index: 1,
          body: { x: 1, y: 1, width: 1, height: 8, fill: '#EF4444' },
          wick: { x: 1, y: 1, width: 1, height: 12, fill: '#94A3B8' },
        },
      ],
      '30min': [],
      '120min': [],
    },
    positionType: 'SHORT',
    status: 'CLOSED',
    openTimestamp: '2026-03-01T12:10:00Z',
    closeTimestamp: '2026-03-01T12:15:00Z',
    entryPrice: 30,
    exitPrice: 28,
    profitLoss: 200,
    closeActionLabel: null,
  },
]

const openTransaction = vi.fn()
const closeTransaction = vi.fn()

vi.mock('../live/useDashboardFeed', () => ({
  useDashboardFeed: () => ({
    cards: mockCardsState,
    transactions: mockTransactions,
    status: 'live',
    updatedAt: '2026-03-01T12:10:00Z',
    sessionState: 'OPEN',
    openTransaction,
    closeTransaction,
  }),
}))

describe('StockDashboard', () => {
  beforeEach(() => {
    mockCardsState = [...mockCards]
    openTransaction.mockClear()
    closeTransaction.mockClear()
  })

  it('renders transactions grid with open and closed items', () => {
    const { container } = render(<StockDashboard />)

    expect(screen.getByText('Transactions')).toBeInTheDocument()
    expect(screen.getByTestId('transaction-tx-open')).toBeInTheDocument()
    expect(screen.getByTestId('transaction-tx-closed')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sell' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Cover' })).not.toBeInTheDocument()
    expect(container.querySelectorAll('.candlestick-plot')).toHaveLength(3)
    expect(container.querySelectorAll('.chart-reference-line')).toHaveLength(3)
  })

  it('renders connection status and timestamp', () => {
    render(<StockDashboard />)

    expect(screen.getByText('Live')).toBeInTheDocument()
    expect(screen.getByText(/Updated: 2026-03-01T12:10:00Z/)).toBeInTheDocument()
  })

  it('renders live cards from feed hook', () => {
    render(<StockDashboard />)

    expect(screen.getAllByText('AAPL').length).toBeGreaterThan(0)
    expect(screen.getByText('+2.10%')).toBeInTheDocument()
  })

  it('calls open and close transaction actions from buttons', () => {
    render(<StockDashboard />)

    fireEvent.click(screen.getByRole('button', { name: 'Buy' }))
    fireEvent.click(screen.getByRole('button', { name: 'Sell' }))

    expect(openTransaction).toHaveBeenCalledWith('AAPL', 'LONG')
    expect(closeTransaction).toHaveBeenCalledWith('tx-open')
  })

  it('switches active range when a range button is clicked', () => {
    const { container } = render(<StockDashboard />)
    const stockCard = container.querySelector('.stock-card') as HTMLElement

    const range5 = within(stockCard).getByRole('button', { name: '5min' })
    const range30 = within(stockCard).getByRole('button', { name: '30min' })
    const firstBody = container.querySelector('.body') as HTMLSpanElement

    expect(range5.className).toContain('range-chip-active')
    expect(range30.className).not.toContain('range-chip-active')
    expect(firstBody.style.background).toBe('rgb(34, 197, 94)')

    fireEvent.click(range30)

    expect(range30.className).toContain('range-chip-active')
    expect(range5.className).not.toContain('range-chip-active')
    expect(firstBody.style.background).toBe('rgb(239, 68, 68)')
  })

  it('keeps selected range when cards reorder in the grid', () => {
    const msftCard: StockCardModel = {
      ...mockCards[0],
      cardId: 'gainer-MSFT',
      symbol: 'MSFT',
      percentChange: 1.1,
    }

    mockCardsState = [mockCards[0], msftCard]
    const { rerender } = render(<StockDashboard />)

    const aaplCard = screen.getByTestId('stock-gainer-AAPL')
    fireEvent.click(within(aaplCard).getByRole('button', { name: '30min' }))
    expect(within(aaplCard).getByRole('button', { name: '30min' }).className).toContain('range-chip-active')

    mockCardsState = [msftCard, mockCards[0]]
    rerender(<StockDashboard />)

    const aaplCardAfterMove = screen.getByTestId('stock-gainer-AAPL')
    expect(within(aaplCardAfterMove).getByRole('button', { name: '30min' }).className).toContain(
      'range-chip-active',
    )
  })
})
