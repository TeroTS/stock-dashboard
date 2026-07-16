import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createDashboardFeedClient } from '../dashboardFeedClient.ts'
import type { DashboardSnapshotDto } from '../types.ts'

class MockWebSocket {
  static instances: MockWebSocket[] = []

  url: string
  onopen: (() => void) | null = null
  onmessage: ((event: MessageEvent<string>) => void) | null = null
  onclose: (() => void) | null = null
  onerror: (() => void) | null = null
  close = vi.fn()

  constructor(url: string) {
    this.url = url
    MockWebSocket.instances.push(this)
  }
}

describe('createDashboardFeedClient', () => {
  const snapshot: DashboardSnapshotDto = {
    updatedAt: 1784054639000,
    topGainers: [],
    topLosers: [],
    transactions: [],
  }

  beforeEach(() => {
    MockWebSocket.instances = []
    vi.clearAllMocks()
    vi.stubGlobal('WebSocket', MockWebSocket)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('opens a plain websocket on connect and closes it on disconnect', () => {
    const client = createDashboardFeedClient({ onSnapshot: vi.fn() })

    client.connect()
    const socket = MockWebSocket.instances[0]

    expect(socket.url).toBe('ws://localhost:8080/ws')

    client.disconnect()

    expect(socket.close).toHaveBeenCalledTimes(1)
  })

  it('notifies when the websocket opens', () => {
    const onConnected = vi.fn()
    createDashboardFeedClient({ onConnected, onSnapshot: vi.fn() }).connect()

    const socket = MockWebSocket.instances[0]
    socket.onopen?.()

    expect(onConnected).toHaveBeenCalledTimes(1)
  })

  it('forwards parsed snapshot payloads', () => {
    const onSnapshot = vi.fn()
    createDashboardFeedClient({ onSnapshot }, { wsUrl: 'ws://example.test/ws' }).connect()

    const socket = MockWebSocket.instances[0]
    expect(socket.url).toBe('ws://example.test/ws')

    socket.onmessage?.({ data: JSON.stringify(snapshot) } as MessageEvent<string>)

    expect(onSnapshot).toHaveBeenCalledWith(snapshot)
  })

  it('ignores invalid snapshot payloads', () => {
    const onSnapshot = vi.fn()
    createDashboardFeedClient({ onSnapshot }).connect()

    const socket = MockWebSocket.instances[0]
    socket.onmessage?.({ data: '{bad-json' } as MessageEvent<string>)

    expect(onSnapshot).not.toHaveBeenCalled()
  })

  it('calls disconnected callback on close and error', () => {
    const onDisconnected = vi.fn()
    createDashboardFeedClient({ onSnapshot: vi.fn(), onDisconnected }).connect()

    const socket = MockWebSocket.instances[0]
    socket.onclose?.()
    socket.onerror?.()

    expect(onDisconnected).toHaveBeenCalledTimes(2)
  })
})
