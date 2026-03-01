import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { StockDashboard } from './StockDashboard'
import type { StockCardModel } from '../types'

const mockCards: StockCardModel[] = [
  {
    symbol: 'AAPL',
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

  it('switches active range when a range button is clicked', () => {
    const { container } = render(<StockDashboard />)

    const range5 = screen.getByRole('button', { name: '5min' })
    const range30 = screen.getByRole('button', { name: '30min' })
    const firstBody = container.querySelector('.body') as HTMLSpanElement

    expect(range5.className).toContain('range-chip-active')
    expect(range30.className).not.toContain('range-chip-active')
    expect(firstBody.style.background).toBe('rgb(34, 197, 94)')

    fireEvent.click(range30)

    expect(range30.className).toContain('range-chip-active')
    expect(range5.className).not.toContain('range-chip-active')
    expect(firstBody.style.background).toBe('rgb(239, 68, 68)')
  })
})
