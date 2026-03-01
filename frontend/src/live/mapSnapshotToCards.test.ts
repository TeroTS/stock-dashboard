import { describe, expect, it } from 'vitest'
import { mapSnapshotToStockCards } from './mapSnapshotToCards'
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
}

describe('mapSnapshotToStockCards', () => {
  it('combines gainers and losers with dedupe and preserves order', () => {
    const cards = mapSnapshotToStockCards(snapshot)

    expect(cards.map((card) => card.symbol)).toEqual(['AAPL', 'MSFT', 'TSLA'])
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
})
