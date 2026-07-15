import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { TransactionCard } from '../TransactionCard.tsx'
import type { TransactionCardModel } from '../../types.ts'

const closedTransaction: TransactionCardModel = {
  transactionId: 'tx-closed',
  symbol: 'AAPL',
  positionType: 'LONG',
  status: 'CLOSED',
  submittedAt: 1784054638500,
  openedAt: 1784054639000,
  closedAt: 1784054640000,
  entryPrice: 211.32,
  exitPrice: 212.32,
  profitLoss: 100,
  points: [
    { timestamp: 1784054639000, close: 211.32 },
    { timestamp: 1784054640000, close: 212.32 },
  ],
}

describe('TransactionCard', () => {
  it('shows closed transaction profit loss in the header only', () => {
    render(<TransactionCard transaction={closedTransaction} />)

    expect(screen.getByText('AAPL')).toBeInTheDocument()
    expect(screen.getByText('Status: CLOSED')).toBeInTheDocument()
    expect(screen.getByText('+100.00')).toBeInTheDocument()
    expect(screen.queryByText(/^P\/L:/)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Sell|Cover/ })).not.toBeInTheDocument()
  })
})
