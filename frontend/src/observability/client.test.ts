import { describe, expect, it, vi } from 'vitest'
import { ConsoleTelemetryClient, NoopTelemetryClient, createTelemetryClient } from './client'
import type { TelemetryEnvelope } from './types'

const sampleEvent: TelemetryEnvelope<'feed.snapshot.received'> = {
  name: 'feed.snapshot.received',
  ts: '2026-03-03T14:30:00.000Z',
  app: 'stock-dashboard-frontend',
  env: 'test',
  version: 'test',
  sessionId: 'session-id',
  path: '/dashboard',
  payload: {
    sessionState: 'OPEN',
    cardsCount: 2,
    transactionsCount: 1,
  },
}

describe('telemetry clients', () => {
  it('noop client ignores events', () => {
    const client = new NoopTelemetryClient()
    expect(() => client.emit(sampleEvent)).not.toThrow()
  })

  it('console client writes structured event', () => {
    const spy = vi.spyOn(console, 'info').mockImplementation(() => undefined)
    const client = new ConsoleTelemetryClient()

    client.emit(sampleEvent)

    expect(spy).toHaveBeenCalledWith('[telemetry]', sampleEvent)
    spy.mockRestore()
  })

  it('creates noop/console client from flags', () => {
    expect(createTelemetryClient({ enabled: false, consoleTransport: true })).toBeInstanceOf(NoopTelemetryClient)
    expect(createTelemetryClient({ enabled: true, consoleTransport: false })).toBeInstanceOf(NoopTelemetryClient)
    expect(createTelemetryClient({ enabled: true, consoleTransport: true })).toBeInstanceOf(ConsoleTelemetryClient)
  })
})
