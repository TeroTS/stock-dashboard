import { describe, expect, it } from 'vitest'
import { connectionStateReducer, initialConnectionState } from '../connectionState.ts'

describe('connectionStateReducer', () => {
  it('transitions to live on first snapshot without carrying unused snapshot flags', () => {
    const next = connectionStateReducer(initialConnectionState, { type: 'snapshot_received' })

    expect(next.status).toBe('live')
    expect(next).not.toHaveProperty('hadLiveSnapshot')
  })

  it('transitions from live to reconnecting on disconnect', () => {
    const reconnecting = connectionStateReducer({ ...initialConnectionState, status: 'live' }, { type: 'disconnected' })

    expect(reconnecting.status).toBe('reconnecting')
  })

  it('transitions to fallback without carrying retry counters in state', () => {
    const fallback = connectionStateReducer(
      { ...initialConnectionState, status: 'reconnecting' },
      { type: 'retry_exhausted' },
    )

    expect(fallback.status).toBe('fallback')
    expect(fallback).not.toHaveProperty('retries')
  })
})
