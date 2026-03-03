import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createDashboardFeedClient } from './dashboardFeedClient'
import type { DashboardSnapshotDto } from './types'

type SnapshotHandler = (message: { body: string }) => void

interface MockClientInstance {
  config: {
    brokerURL: string
    onConnect?: () => void
    onWebSocketClose?: () => void
    onWebSocketError?: () => void
  }
  activate: ReturnType<typeof vi.fn>
  deactivate: ReturnType<typeof vi.fn>
  unsubscribe: ReturnType<typeof vi.fn>
  subscribe: ReturnType<typeof vi.fn>
  subscribedTopic: string | null
  snapshotHandler: SnapshotHandler | null
}

const registry = vi.hoisted(() => ({
  instances: [] as MockClientInstance[],
}))

vi.mock('@stomp/stompjs', () => ({
  Client: class MockClient {
    config: MockClientInstance['config']
    activate = vi.fn()
    deactivate = vi.fn()
    unsubscribe = vi.fn()
    subscribe = vi.fn((topic: string, handler: SnapshotHandler) => {
      this.subscribedTopic = topic
      this.snapshotHandler = handler
      return { unsubscribe: this.unsubscribe }
    })
    subscribedTopic: string | null = null
    snapshotHandler: SnapshotHandler | null = null

    constructor(config: MockClientInstance['config']) {
      this.config = config
      registry.instances.push(this)
    }
  },
}))

describe('createDashboardFeedClient', () => {
  const snapshot: DashboardSnapshotDto = {
    generatedAt: '2026-03-03T14:30:00Z',
    sessionState: 'OPEN',
    topGainers: [],
    topLosers: [],
    transactions: [],
  }

  beforeEach(() => {
    registry.instances = []
    vi.clearAllMocks()
  })

  it('activates on connect and deactivates on disconnect', () => {
    const client = createDashboardFeedClient({ onSnapshot: vi.fn() }, { topic: '/topic/custom' })
    const instance = registry.instances[0]

    client.connect()
    expect(instance.activate).toHaveBeenCalledTimes(1)

    instance.config.onConnect?.()
    client.disconnect()

    expect(instance.unsubscribe).toHaveBeenCalledTimes(1)
    expect(instance.deactivate).toHaveBeenCalledTimes(1)
  })

  it('calls connected callback and forwards valid snapshot payload', () => {
    const onConnected = vi.fn()
    const onSnapshot = vi.fn()

    createDashboardFeedClient(
      {
        onConnected,
        onSnapshot,
      },
      { wsUrl: 'ws://example/ws', topic: '/topic/custom' },
    )
    const instance = registry.instances[0]

    expect(instance.config.brokerURL).toBe('ws://example/ws')

    instance.config.onConnect?.()
    expect(onConnected).toHaveBeenCalledTimes(1)
    expect(instance.subscribedTopic).toBe('/topic/custom')

    instance.snapshotHandler?.({ body: JSON.stringify(snapshot) })
    expect(onSnapshot).toHaveBeenCalledWith(snapshot)
  })

  it('ignores invalid snapshot payloads', () => {
    const onSnapshot = vi.fn()
    createDashboardFeedClient({ onSnapshot })
    const instance = registry.instances[0]

    instance.config.onConnect?.()
    instance.snapshotHandler?.({ body: '{invalid-json' })

    expect(onSnapshot).not.toHaveBeenCalled()
  })

  it('calls disconnected callback on socket close and error', () => {
    const onDisconnected = vi.fn()
    createDashboardFeedClient({ onSnapshot: vi.fn(), onDisconnected })
    const instance = registry.instances[0]

    instance.config.onWebSocketClose?.()
    instance.config.onWebSocketError?.()

    expect(onDisconnected).toHaveBeenCalledTimes(2)
  })

  it('uses default topic when no options are provided', () => {
    createDashboardFeedClient({ onSnapshot: vi.fn() })
    const instance = registry.instances[0]

    instance.config.onConnect?.()

    expect(instance.subscribedTopic).toBe('/topic/dashboard-snapshots')
  })
})
