import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { StockDashboard } from './StockDashboard'
import type { StockCardModel } from '../types'

const mockCards: StockCardModel[] = [
  {
    symbol: 'AAPL',
    timeRanges: ['5min', '30min', '120min'],
    activeRange: '5min',
    yAxisLabels: ['10.00', '9.50', '9.00'],
    xAxisLabels: ['12:00'],
    gridLines: [{ x: 1, y: 1, width: 1, height: 1 }],
    candles: [
      {
        index: 1,
        body: { x: 1, y: 1, width: 1, height: 10, fill: '#22C55E' },
        wick: { x: 1, y: 1, width: 1, height: 15, fill: '#94A3B8' },
      },
    ],
    buyLabel: 'Buy',
    shortLabel: 'Short',
  },
]

vi.mock('../live/useDashboardFeed', () => ({
  useDashboardFeed: () => ({
    cards: mockCards,
    status: 'live',
    updatedAt: '2026-03-01T12:10:00Z',
    sessionState: 'OPEN',
  }),
}))

describe('StockDashboard', () => {
  it('renders connection status and timestamp', () => {
    render(<StockDashboard />)

    expect(screen.getByText('Live')).toBeInTheDocument()
    expect(screen.getByText(/Updated: 2026-03-01T12:10:00Z/)).toBeInTheDocument()
  })

  it('renders live cards from feed hook', () => {
    render(<StockDashboard />)

    expect(screen.getByText('AAPL')).toBeInTheDocument()
  })
})
