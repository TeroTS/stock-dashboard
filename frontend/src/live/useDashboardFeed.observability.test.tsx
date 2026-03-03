import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { DashboardFeedClient, DashboardFeedClientFactory } from './dashboardFeedClient'
import type { DashboardSnapshotDto } from './types'

const mocks = vi.hoisted(() => ({
  emitTelemetry: vi.fn(),
  openTransactionApi: vi.fn(),
  closeTransactionApi: vi.fn(),
}))

vi.mock('../observability', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../observability')>()
  return {
    ...actual,
    emitTelemetry: mocks.emitTelemetry,
  }
})

vi.mock('./transactionsApi', () => ({
  openTransaction: mocks.openTransactionApi,
  closeTransaction: mocks.closeTransactionApi,
}))

import { useDashboardFeed } from './useDashboardFeed'

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

describe('useDashboardFeed observability', () => {
  const snapshot: DashboardSnapshotDto = {
    generatedAt: '2026-03-03T14:30:00Z',
    sessionState: 'OPEN',
    topGainers: [],
    topLosers: [],
    transactions: [],
  }

  beforeEach(() => {
    vi.useFakeTimers()
    mocks.emitTelemetry.mockReset()
    mocks.openTransactionApi.mockReset()
    mocks.closeTransactionApi.mockReset()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('emits transition and snapshot events when snapshot arrives', () => {
    const fake = createFakeClientFactory()
    renderHook(() => useDashboardFeed({ clientFactory: fake.factory, fallbackAfterMs: 10 }))

    act(() => {
      fake.getHandlers()?.onSnapshot(snapshot)
    })

    expect(mocks.emitTelemetry).toHaveBeenCalledWith('feed.lifecycle.transition', {
      from: 'fallback',
      to: 'live',
      reason: 'snapshot_received',
    })
    expect(mocks.emitTelemetry).toHaveBeenCalledWith('feed.snapshot.received', {
      sessionState: 'OPEN',
      cardsCount: 0,
      transactionsCount: 0,
    })
  })

  it('emits disconnect and timeout transitions', () => {
    const fake = createFakeClientFactory()
    renderHook(() => useDashboardFeed({ clientFactory: fake.factory, fallbackAfterMs: 10 }))

    act(() => {
      fake.getHandlers()?.onDisconnected?.()
    })

    expect(mocks.emitTelemetry).toHaveBeenCalledWith('feed.lifecycle.transition', {
      from: 'fallback',
      to: 'reconnecting',
      reason: 'disconnected',
    })

    act(() => {
      vi.runOnlyPendingTimers()
    })

    expect(mocks.emitTelemetry).toHaveBeenCalledWith('feed.lifecycle.transition', {
      from: 'reconnecting',
      to: 'fallback',
      reason: 'retry_exhausted',
    })
  })

  it('emits api failure telemetry for open and close actions', async () => {
    mocks.openTransactionApi.mockRejectedValueOnce(new Error('Transaction API request failed with status 503'))
    mocks.closeTransactionApi.mockRejectedValueOnce(new Error('Transaction API request failed with status 409'))
    const fake = createFakeClientFactory()
    const { result } = renderHook(() => useDashboardFeed({ clientFactory: fake.factory }))

    await act(async () => {
      await result.current.openTransaction('AAPL', 'LONG')
      await result.current.closeTransaction('tx-1')
    })

    expect(mocks.emitTelemetry).toHaveBeenCalledWith('api.transaction.failure', {
      operation: 'open',
      errorClass: 'Error',
      message: 'Transaction API request failed with status 503',
      name: 'Error',
      statusCode: 503,
    })
    expect(mocks.emitTelemetry).toHaveBeenCalledWith('api.transaction.failure', {
      operation: 'close',
      errorClass: 'Error',
      message: 'Transaction API request failed with status 409',
      name: 'Error',
      statusCode: 409,
    })
  })
})
