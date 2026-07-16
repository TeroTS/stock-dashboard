import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { useDashboardFeed } from '../useDashboardFeed.ts'
import type { DashboardSnapshotDto } from '../types.ts'
import type { DashboardFeedClient, DashboardFeedClientFactory } from '../dashboardFeedClient.ts'

const snapshot: DashboardSnapshotDto = {
  updatedAt: 1784054639000,
  topGainers: [
    {
      symbol: 'NVDA',
      close: 303,
      officialOpenPrice: 300,
      percentChange: 1,
      points: [{ timestamp: 1784054639000, close: 303 }],
    },
  ],
  topLosers: [
    {
      symbol: 'TSLA',
      close: 198,
      officialOpenPrice: 200,
      percentChange: -1,
      points: [{ timestamp: 1784054639000, close: 198 }],
    },
  ],
  transactions: [
    {
      transactionId: 'tx-1',
      symbol: 'NVDA',
      positionType: 'LONG',
      status: 'OPEN',
      submittedAt: 1784054638000,
      openedAt: 1784054639000,
      closedAt: null,
      entryPrice: 303,
      exitPrice: null,
      profitLoss: null,
      points: [{ timestamp: 1784054639000, close: 303 }],
    },
  ],
}

function createFakeClientFactory() {
  let handlers: Parameters<DashboardFeedClientFactory>[0] | null = null
  let connectCalls = 0
  const client: DashboardFeedClient = {
    connect: () => {
      connectCalls += 1
    },
    disconnect: () => undefined,
  }

  const factory: DashboardFeedClientFactory = (nextHandlers) => {
    handlers = nextHandlers
    return client
  }

  return {
    factory,
    getConnectCalls: () => connectCalls,
    getHandlers: () => handlers,
  }
}

describe('useDashboardFeed', () => {
  it('starts in fallback state with empty live data', () => {
    const fake = createFakeClientFactory()
    const { result } = renderHook(() => useDashboardFeed({ clientFactory: fake.factory }))

    expect(result.current.status).toBe('fallback')
    expect(result.current.topGainers).toEqual([])
    expect(result.current.topLosers).toEqual([])
    expect(result.current.transactions).toEqual([])
  })

  it('shows connected before the first eligible snapshot arrives', () => {
    const fake = createFakeClientFactory()
    const { result } = renderHook(() => useDashboardFeed({ clientFactory: fake.factory }))

    act(() => {
      fake.getHandlers()?.onConnected?.()
    })

    expect(result.current.status).toBe('connected')
    expect(result.current.updatedAt).toBeNull()
    expect(result.current.topGainers).toEqual([])
    expect(result.current.topLosers).toEqual([])
    expect(result.current.transactions).toEqual([])
  })

  it('switches to live data when snapshot arrives', () => {
    const fake = createFakeClientFactory()
    const { result } = renderHook(() => useDashboardFeed({ clientFactory: fake.factory }))

    act(() => {
      fake.getHandlers()?.onSnapshot(snapshot)
    })

    expect(result.current.status).toBe('live')
    expect(result.current.topGainers[0].symbol).toBe('NVDA')
    expect(result.current.topLosers[0].symbol).toBe('TSLA')
    expect(result.current.transactions[0].transactionId).toBe('tx-1')
    expect(result.current.updatedAt).toBe(1784054639000)
  })

  it('does not expose a client-side fallback callback and falls back by timer', () => {
    vi.useFakeTimers()
    const fake = createFakeClientFactory()
    const { result } = renderHook(() => useDashboardFeed({ clientFactory: fake.factory, fallbackAfterMs: 10 }))

    expect(fake.getHandlers()).not.toHaveProperty('onFallback')

    act(() => {
      fake.getHandlers()?.onDisconnected?.()
    })
    expect(result.current.status).toBe('reconnecting')

    act(() => {
      vi.advanceTimersByTime(10)
    })
    expect(result.current.status).toBe('fallback')

    vi.useRealTimers()
  })

  it('retries the websocket connection after disconnect and recovers on reconnect', () => {
    vi.useFakeTimers()
    const fake = createFakeClientFactory()
    const { result } = renderHook(() => useDashboardFeed({ clientFactory: fake.factory, fallbackAfterMs: 10 }))

    expect(fake.getConnectCalls()).toBe(1)

    act(() => {
      fake.getHandlers()?.onDisconnected?.()
    })
    expect(result.current.status).toBe('reconnecting')

    act(() => {
      vi.runOnlyPendingTimers()
    })
    expect(fake.getConnectCalls()).toBe(2)
    expect(result.current.status).toBe('fallback')

    act(() => {
      fake.getHandlers()?.onConnected?.()
    })
    expect(result.current.status).toBe('connected')

    vi.useRealTimers()
  })
})
