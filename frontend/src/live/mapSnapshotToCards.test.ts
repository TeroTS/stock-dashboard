import { describe, expect, it } from 'vitest'
import { mapSnapshotToStockCards, mapSnapshotToTransactions } from './mapSnapshotToCards'
import type { DashboardSnapshotDto } from './types'

const snapshot: DashboardSnapshotDto = {
  generatedAt: '2026-03-01T12:00:00Z',
  sessionState: 'OPEN',
  topGainers: [
    {
      symbol: 'AAPL',
      percentChange: 2.1,
      timeRanges: ['5min', '30min', '120min'],
      activeRange: '5min',
      candlesByRange: {
        '5min': [
          {
            bucketStart: '2026-03-01T11:59:00Z',
            open: 100,
            high: 102,
            low: 99,
            close: 101,
            volume: 1000,
          },
          {
            bucketStart: '2026-03-01T12:00:00Z',
            open: 101,
            high: 103,
            low: 100,
            close: 102,
            volume: 900,
          },
        ],
        '30min': [],
        '120min': [],
      },
      yAxisLabels: ['103.00', '101.00', '99.00'],
      xAxisLabels: ['11:59', '12:00'],
      buyLabel: 'Buy',
      shortLabel: 'Short',
    },
    {
      symbol: 'MSFT',
      percentChange: 1.2,
      timeRanges: ['5min', '30min', '120min'],
      activeRange: '5min',
      candlesByRange: {
        '5min': [
          {
            bucketStart: '2026-03-01T11:59:00Z',
            open: 200,
            high: 204,
            low: 198,
            close: 203,
            volume: 800,
          },
        ],
        '30min': [],
        '120min': [],
      },
      yAxisLabels: ['204.00', '201.00', '198.00'],
      xAxisLabels: ['11:59'],
      buyLabel: 'Buy',
      shortLabel: 'Short',
    },
  ],
  topLosers: [
    {
      symbol: 'AAPL',
      percentChange: -0.2,
      timeRanges: ['5min', '30min', '120min'],
      activeRange: '5min',
      candlesByRange: {
        '5min': [],
        '30min': [],
        '120min': [],
      },
      yAxisLabels: ['1.00', '1.00', '1.00'],
      xAxisLabels: [],
      buyLabel: 'Buy',
      shortLabel: 'Short',
    },
    {
      symbol: 'TSLA',
      percentChange: -3.6,
      timeRanges: ['5min', '30min', '120min'],
      activeRange: '5min',
      candlesByRange: {
        '5min': [
          {
            bucketStart: '2026-03-01T11:59:00Z',
            open: 50,
            high: 51,
            low: 49,
            close: 49.5,
            volume: 600,
          },
        ],
        '30min': [],
        '120min': [],
      },
      yAxisLabels: ['51.00', '50.00', '49.00'],
      xAxisLabels: ['11:59'],
      buyLabel: 'Buy',
      shortLabel: 'Short',
    },
  ],
  transactions: [
    {
      transactionId: 'tx-1',
      symbol: 'AAPL',
      timeRanges: ['5min', '30min', '120min'],
      activeRange: '5min',
      candlesByRange: {
        '5min': [
          {
            bucketStart: '2026-03-01T12:00:00Z',
            open: 101,
            high: 102,
            low: 100.5,
            close: 101.5,
            volume: 300,
          },
        ],
        '30min': [],
        '120min': [],
      },
      yAxisLabels: ['102.00', '101.25', '100.50'],
      xAxisLabels: ['12:00'],
      positionType: 'LONG',
      status: 'OPEN',
      openTimestamp: '2026-03-01T12:02:00Z',
      closeTimestamp: null,
      entryPrice: 100,
      exitPrice: null,
      profitLoss: null,
      closeActionLabel: 'Sell',
    },
    {
      transactionId: 'tx-2',
      symbol: 'TSLA',
      timeRanges: ['5min', '30min', '120min'],
      activeRange: '5min',
      candlesByRange: {
        '5min': [
          {
            bucketStart: '2026-03-01T12:00:00Z',
            open: 49.5,
            high: 50,
            low: 49,
            close: 49.2,
            volume: 200,
          },
        ],
        '30min': [],
        '120min': [],
      },
      yAxisLabels: ['50.00', '49.50', '49.00'],
      xAxisLabels: ['12:00'],
      positionType: 'SHORT',
      status: 'CLOSED',
      openTimestamp: '2026-03-01T11:59:00Z',
      closeTimestamp: '2026-03-01T12:01:00Z',
      entryPrice: 50,
      exitPrice: 49,
      profitLoss: 100,
      closeActionLabel: null,
    },
  ],
}

describe('mapSnapshotToStockCards', () => {
  it('combines gainers and losers without dedupe and preserves order', () => {
    const cards = mapSnapshotToStockCards(snapshot)

    expect(cards.map((card) => card.symbol)).toEqual(['AAPL', 'MSFT', 'AAPL', 'TSLA'])
    expect(cards[0].cardId).toBe('gainer-0-AAPL')
    expect(cards[2].cardId).toBe('loser-0-AAPL')
  })

  it('maps candles and labels for each range', () => {
    const cards = mapSnapshotToStockCards(snapshot)

    const aapl = cards[0]
    expect(aapl.percentChange).toBe(2.1)
    expect(aapl.activeRange).toBe('5min')
    expect(aapl.yAxisLabelsByRange['5min']).toEqual(['103.00', '101.00', '99.00'])
    expect(aapl.candlesByRange['5min']).toHaveLength(2)
    expect(aapl.candlesByRange['30min']).toHaveLength(0)
    expect(aapl.xAxisLabelsByRange['5min'].length).toBeGreaterThan(0)

    expect(aapl.candlesByRange['5min'][0].body.fill).toBe('#22C55E')
    expect(aapl.candlesByRange['5min'][0].body.height).toBeGreaterThan(0)
    expect(aapl.candlesByRange['5min'][0].wick.height).toBeGreaterThan(0)
  })

  it('maps transaction cards newest first', () => {
    const transactions = mapSnapshotToTransactions(snapshot)

    expect(transactions).toHaveLength(2)
    expect(transactions[0].transactionId).toBe('tx-1')
    expect(transactions[1].transactionId).toBe('tx-2')
    expect(transactions[0].candlesByRange['5min']).toHaveLength(1)
    expect(transactions[0].yAxisLabelsByRange['5min']).toEqual(['102.00', '101.25', '100.50'])
    expect(transactions[1].closeActionLabel).toBeNull()
  })

  it('keeps 10 slots when gainers and losers overlap', () => {
    const tenSlotSnapshot: DashboardSnapshotDto = {
      generatedAt: '2026-03-01T12:00:00Z',
      sessionState: 'OPEN',
      topGainers: Array.from({ length: 5 }, (_, index) => ({
        ...snapshot.topGainers[0],
        symbol: `G${index}`,
      })),
      topLosers: [
        { ...snapshot.topLosers[0], symbol: 'G4' },
        ...Array.from({ length: 4 }, (_, index) => ({
          ...snapshot.topLosers[0],
          symbol: `L${index}`,
        })),
      ],
      transactions: [],
    }

    const cards = mapSnapshotToStockCards(tenSlotSnapshot)

    expect(cards).toHaveLength(10)
    expect(cards[0].cardId).toBe('gainer-0-G0')
    expect(cards[5].cardId).toBe('loser-0-G4')
  })
})
