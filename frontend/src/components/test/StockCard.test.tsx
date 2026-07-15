import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { StockCard } from '../StockCard.tsx'
import type { StockCardModel } from '../../types.ts'

const card: StockCardModel = {
  symbol: 'AAPL',
  close: 211.32,
  officialOpenPrice: 208.5,
  percentChange: 1.35,
  points: [
    { timestamp: 1784054638000, close: 211.18 },
    { timestamp: 1784054639000, close: 211.32 },
  ],
}

describe('StockCard', () => {
  it('shows only the symbol header, chart, and trade buttons', () => {
    render(<StockCard card={card} onBuy={vi.fn()} onShort={vi.fn()} />)

    expect(screen.getByText('AAPL')).toBeInTheDocument()
    expect(screen.queryByText('Close: 211.32')).not.toBeInTheDocument()
    expect(screen.queryByText('Open: 208.50')).not.toBeInTheDocument()
    expect(screen.queryByText('Points: 2')).not.toBeInTheDocument()
    expect(screen.queryByText('Latest tick: 211.32')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Buy AAPL' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Short AAPL' })).toBeInTheDocument()
  })

  it('renders one discrete chart dash per snapshot point', () => {
    render(<StockCard card={card} onBuy={vi.fn()} onShort={vi.fn()} />)

    const chart = screen.getByTestId('stock-chart-AAPL')
    const dashes = chart.querySelectorAll('.stock-chart-dash')
    const polyline = chart.querySelector('polyline')

    expect(chart.tagName.toLowerCase()).toBe('svg')
    expect(dashes).toHaveLength(2)
    expect(dashes[0]?.getAttribute('x1')).toBe('0')
    expect(dashes[0]?.getAttribute('x2')).toBe('2')
    expect(dashes[0]?.getAttribute('y1')).toBe('40')
    expect(dashes[0]?.getAttribute('y2')).toBe('40')
    expect(dashes[0]?.getAttribute('vector-effect')).toBe('non-scaling-stroke')
    expect(dashes[1]?.getAttribute('x1')).toBe('98')
    expect(dashes[1]?.getAttribute('x2')).toBe('100')
    expect(dashes[1]?.getAttribute('y1')).toBe('0')
    expect(dashes[1]?.getAttribute('y2')).toBe('0')
    expect(polyline).toBeNull()
  })

  it('shrinks dash width for dense series so adjacent markers do not overlap', () => {
    const denseCard: StockCardModel = {
      ...card,
      points: Array.from({ length: 51 }, (_, index) => ({
        timestamp: 1784054638000 + index,
        close: 200 + index,
      })),
    }

    render(<StockCard card={denseCard} onBuy={vi.fn()} onShort={vi.fn()} />)

    const chart = screen.getByTestId('stock-chart-AAPL')
    const firstDash = chart.querySelector('.stock-chart-dash')

    expect(firstDash).not.toBeNull()
    expect(Number(firstDash?.getAttribute('x2')) - Number(firstDash?.getAttribute('x1'))).toBeLessThan(2)
  })
})
