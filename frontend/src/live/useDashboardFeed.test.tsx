import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useDashboardFeed } from './useDashboardFeed'
import type { DashboardSnapshotDto } from './types'
import type { DashboardFeedClient, DashboardFeedClientFactory } from './dashboardFeedClient'

const snapshot: DashboardSnapshotDto = {
  generatedAt: '2026-03-01T12:05:00Z',
  sessionState: 'OPEN',
  topGainers: [
    {
      symbol: 'NVDA',
      percentChange: 4.5,
      timeRanges: ['5min', '30min', '120min'],
      activeRange: '5min',
      candlesByRange: {
        '5min': [
          {
            bucketStart: '2026-03-01T12:05:00Z',
            open: 300,
            high: 304,
            low: 299,
            close: 303,
            volume: 1200,
          },
        ],
        '30min': [],
        '120min': [],
      },
      yAxisLabels: ['304.00', '301.50', '299.00'],
      xAxisLabels: ['12:05'],
      buyLabel: 'Buy',
      shortLabel: 'Short',
    },
  ],
  topLosers: [],
  transactions: [
    {
      transactionId: 'tx-1',
      symbol: 'NVDA',
      timeRanges: ['5min', '30min', '120min'],
      activeRange: '5min',
      candlesByRange: {
        '5min': [
          {
            bucketStart: '2026-03-01T12:05:00Z',
            open: 303,
            high: 304,
            low: 302,
            close: 303.5,
            volume: 500,
          },
        ],
        '30min': [],
        '120min': [],
      },
      yAxisLabels: ['304.00', '303.00', '302.00'],
      xAxisLabels: ['12:05'],
      positionType: 'LONG',
      status: 'OPEN',
      openTimestamp: '2026-03-01T12:04:30Z',
      closeTimestamp: null,
      entryPrice: 300,
      exitPrice: null,
      profitLoss: null,
      closeActionLabel: 'Sell',
    },
  ],
}

function createFakeClientFactory() {
  let handlers: Parameters<DashboardFeedClientFactory>[0] | null = null
  const client: DashboardFeedClient = {
    connect: () => undefined,
    disconnect: () => undefined,
  }

  const factory: DashboardFeedClientFactory = (nextHandlers) => {
    handlers = nextHandlers
    return client
  }

  return {
    factory,
    getHandlers: () => handlers,
  }
}

describe('useDashboardFeed', () => {
  it('starts in fallback state with static cards', () => {
    const fake = createFakeClientFactory()
    const { result } = renderHook(() => useDashboardFeed({ clientFactory: fake.factory }))

    expect(result.current.status).toBe('fallback')
    expect(result.current.cards.length).toBeGreaterThan(0)
    expect(result.current.transactions).toEqual([])
  })

  it('switches to live cards when snapshot arrives', () => {
    const fake = createFakeClientFactory()
    const { result } = renderHook(() => useDashboardFeed({ clientFactory: fake.factory }))

    act(() => {
      fake.getHandlers()?.onSnapshot(snapshot)
    })

    expect(result.current.status).toBe('live')
    expect(result.current.cards[0].symbol).toBe('NVDA')
    expect(result.current.transactions[0].transactionId).toBe('tx-1')
    expect(result.current.updatedAt).toBe('2026-03-01T12:05:00Z')
  })

  it('moves to reconnecting and back to fallback on connection loss', () => {
    const fake = createFakeClientFactory()
    const { result } = renderHook(() => useDashboardFeed({ clientFactory: fake.factory }))

    act(() => {
      fake.getHandlers()?.onDisconnected?.()
    })
    expect(result.current.status).toBe('reconnecting')

    act(() => {
      fake.getHandlers()?.onFallback?.()
    })
    expect(result.current.status).toBe('fallback')
  })
})
