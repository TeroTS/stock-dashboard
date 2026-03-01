import { describe, expect, it } from 'vitest'
import { connectionStateReducer, initialConnectionState } from './connectionState'

describe('connectionStateReducer', () => {
  it('transitions to live on first snapshot', () => {
    const next = connectionStateReducer(initialConnectionState, { type: 'snapshot_received' })

    expect(next.status).toBe('live')
    expect(next.hadLiveSnapshot).toBe(true)
  })

  it('transitions from live to reconnecting on disconnect', () => {
    const reconnecting = connectionStateReducer(
      { ...initialConnectionState, status: 'live', hadLiveSnapshot: true },
      { type: 'disconnected' },
    )

    expect(reconnecting.status).toBe('reconnecting')
  })

  it('transitions to fallback when retries are exhausted', () => {
    const fallback = connectionStateReducer(
      { ...initialConnectionState, status: 'reconnecting', retries: 5 },
      { type: 'retry_exhausted' },
    )

    expect(fallback.status).toBe('fallback')
  })
})
