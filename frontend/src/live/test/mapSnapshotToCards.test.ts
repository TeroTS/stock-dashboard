import { describe, expect, it } from 'vitest'
import { mapSnapshotToStockCards, mapSnapshotToTransactions } from '../mapSnapshotToCards.ts'
import type { DashboardSnapshotDto } from '../types.ts'

const snapshot: DashboardSnapshotDto = {
  updatedAt: 1784054639000,
  topGainers: [
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
  ],
  topLosers: [
    {
      symbol: 'TSLA',
      close: 172.44,
      officialOpenPrice: 176,
      percentChange: -2.02,
      points: [
        { timestamp: 1784054639000, close: 172.44 },
      ],
    },
  ],
  transactions: [
    {
      transactionId: 'tx-1',
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
  ],
}

describe('mapSnapshotToCards', () => {
  it('maps stock cards without changing the contract fields', () => {
    const cards = mapSnapshotToStockCards(snapshot.topGainers)

    expect(cards).toEqual(snapshot.topGainers)
  })

  it('clones nested snapshot point objects before storing stock cards', () => {
    const cards = mapSnapshotToStockCards(snapshot.topGainers)

    snapshot.topGainers[0].points[0].close = 999

    expect(cards[0].points[0].close).toBe(211.18)
  })

  it('sorts transactions newest opened first, with pending opens first when unopened', () => {
    const transactions = mapSnapshotToTransactions([
      snapshot.transactions[0],
      {
        transactionId: 'tx-2',
        symbol: 'TSLA',
        positionType: 'SHORT',
        status: 'PENDING_OPEN',
        submittedAt: 1784054640000,
        openedAt: null,
        closedAt: null,
        entryPrice: null,
        exitPrice: null,
        profitLoss: null,
        points: [],
      },
    ])

    expect(transactions[0].transactionId).toBe('tx-2')
    expect(transactions[1].transactionId).toBe('tx-1')
  })

  it('clones nested snapshot point objects before storing transactions', () => {
    const transactions = mapSnapshotToTransactions(snapshot.transactions)

    snapshot.transactions[0].points[0].close = 999

    expect(transactions[0].points[0].close).toBe(211.32)
  })
})
