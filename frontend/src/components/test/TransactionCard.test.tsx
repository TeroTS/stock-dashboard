import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { TransactionCard } from '../TransactionCard.tsx'
import type { TransactionCardModel } from '../../types.ts'

const pendingOpenTransaction: TransactionCardModel = {
  transactionId: 'tx-pending',
  symbol: 'MSFT',
  positionType: 'LONG',
  status: 'PENDING_OPEN',
  submittedAt: 1784054638500,
  openedAt: null,
  closedAt: null,
  entryPrice: null,
  exitPrice: null,
  profitLoss: null,
  points: [{ timestamp: 1784054638000, close: 100 }],
}

const openTransaction: TransactionCardModel = {
  transactionId: 'tx-open',
  symbol: 'NVDA',
  positionType: 'SHORT',
  status: 'OPEN',
  submittedAt: 1784054638500,
  openedAt: 1784054639000,
  closedAt: null,
  entryPrice: 152.4,
  exitPrice: null,
  profitLoss: null,
  points: [
    { timestamp: 1784054638000, close: 152.1 },
    { timestamp: 1784054639000, close: 152.4 },
  ],
}

const closedTransaction: TransactionCardModel = {
  transactionId: 'tx-closed',
  symbol: 'AAPL',
  positionType: 'LONG',
  status: 'CLOSED',
  submittedAt: 1784054638500,
  openedAt: 1784054639000,
  closedAt: 1784054640000,
  entryPrice: 211.321,
  exitPrice: 212.321,
  profitLoss: 100,
  points: [
    { timestamp: 1784054639000, close: 211.321 },
    { timestamp: 1784054640000, close: 212.321 },
  ],
}

describe('TransactionCard', () => {
  it('shows cancel for pending-open transactions', () => {
    const onCancelOpen = vi.fn()

    render(<TransactionCard transaction={pendingOpenTransaction} onCancelOpen={onCancelOpen} />)

    const button = screen.getByRole('button', { name: 'Cancel MSFT' })
    button.click()

    expect(button).toBeInTheDocument()
    expect(onCancelOpen).toHaveBeenCalledWith('tx-pending')
    expect(screen.queryByRole('button', { name: /Sell|Cover/ })).not.toBeInTheDocument()
  })

  it('resolves flat same-price markers in transaction space before rendering the shared chart', () => {
    render(
      <TransactionCard
        transaction={{
          transactionId: 'tx-flat',
          symbol: 'MSFT',
          positionType: 'LONG',
          status: 'CLOSED',
          submittedAt: 1784054638500,
          openedAt: 1784054638501,
          closedAt: 1784054638503,
          entryPrice: 100,
          exitPrice: 100,
          profitLoss: 0,
          points: [
            { timestamp: 1784054638500, close: 100 },
            { timestamp: 1784054638502, close: 100 },
            { timestamp: 1784054638504, close: 100 },
          ],
        }}
      />,
    )

    const chart = screen.getByTestId('transaction-chart-tx-flat')
    const entryMarker = chart.querySelector('.price-chart-marker-entry')
    const exitMarker = chart.querySelector('.price-chart-marker-exit')

    expect(entryMarker?.getAttribute('x1')).toBe('0')
    expect(exitMarker?.getAttribute('x2')).toBe('100')
  })

  it('shows the chart instead of entry exit and points fields for open transactions', () => {
    render(<TransactionCard transaction={openTransaction} />)

    const chart = screen.getByTestId('transaction-chart-tx-open')

    expect(screen.getByText('NVDA')).toBeInTheDocument()
    expect(screen.getByText('Status: OPEN')).toBeInTheDocument()
    expect(screen.getByText('SHORT')).toBeInTheDocument()
    expect(screen.getByText('-')).toBeInTheDocument()
    expect(screen.queryByText(/^Entry:/)).not.toBeInTheDocument()
    expect(screen.queryByText(/^Exit:/)).not.toBeInTheDocument()
    expect(screen.queryByText(/^Points:/)).not.toBeInTheDocument()
    expect(chart.querySelectorAll('.stock-chart-dash')).toHaveLength(2)
    expect(chart.querySelectorAll('.price-chart-marker-entry')).toHaveLength(1)
    expect(chart.querySelectorAll('.price-chart-marker-exit')).toHaveLength(0)
    expect(chart.querySelectorAll('circle')).toHaveLength(0)
  })

  it('shows closed transaction profit loss in the header and both chart marker dashes', () => {
    render(<TransactionCard transaction={closedTransaction} />)

    const chart = screen.getByTestId('transaction-chart-tx-closed')

    expect(screen.getByText('AAPL')).toBeInTheDocument()
    expect(screen.getByText('Status: CLOSED')).toBeInTheDocument()
    expect(screen.getByText('+100.00')).toBeInTheDocument()
    expect(screen.queryByText(/^Entry:/)).not.toBeInTheDocument()
    expect(screen.queryByText(/^Exit:/)).not.toBeInTheDocument()
    expect(screen.queryByText(/^P\/L:/)).not.toBeInTheDocument()
    expect(screen.queryByText(/^Points:/)).not.toBeInTheDocument()
    expect(chart.querySelectorAll('.price-chart-marker-entry')).toHaveLength(1)
    expect(chart.querySelectorAll('.price-chart-marker-exit')).toHaveLength(1)
    expect(chart.querySelectorAll('.price-chart-marker-dash')).toHaveLength(2)
    expect(screen.queryByRole('button', { name: /Sell|Cover|Cancel/ })).not.toBeInTheDocument()
  })
})
