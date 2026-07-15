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
  it('uses stock-specific value classes instead of transaction styling hooks', () => {
    render(<StockCard card={card} onBuy={vi.fn()} onShort={vi.fn()} />)

    const values = screen.getByText('Close: 211.32').closest('section')
    const latestTick = screen.getByText('Latest tick: 211.32')

    expect(values).toHaveClass('stock-values')
    expect(values).not.toHaveClass('transaction-values')
    expect(latestTick).toHaveClass('stock-line')
    expect(latestTick).not.toHaveClass('transaction-line')
  })
})
