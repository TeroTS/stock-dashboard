import { Client, type IMessage, type StompSubscription } from '@stomp/stompjs'
import type { DashboardSnapshotDto } from './types'

export interface DashboardFeedCallbacks {
  onSnapshot: (snapshot: DashboardSnapshotDto) => void
  onConnected?: () => void
  onDisconnected?: () => void
  onFallback?: () => void
}

export interface DashboardFeedClient {
  connect: () => void
  disconnect: () => void
}

export interface DashboardFeedClientOptions {
  wsUrl: string
  topic: string
}

export type DashboardFeedClientFactory = (
  callbacks: DashboardFeedCallbacks,
  options?: Partial<DashboardFeedClientOptions>,
) => DashboardFeedClient

const DEFAULT_WS_URL = import.meta.env.VITE_WS_URL ?? 'ws://localhost:8080/ws/dashboard'
const DEFAULT_TOPIC = import.meta.env.VITE_WS_TOPIC ?? '/topic/dashboard-snapshots'

function parseSnapshot(message: IMessage): DashboardSnapshotDto | null {
  try {
    return JSON.parse(message.body) as DashboardSnapshotDto
  } catch {
    return null
  }
}

export const createDashboardFeedClient: DashboardFeedClientFactory = (
  callbacks,
  options = {},
) => {
  let subscription: StompSubscription | null = null

  const client = new Client({
    brokerURL: options.wsUrl ?? DEFAULT_WS_URL,
    reconnectDelay: 1000,
    heartbeatIncoming: 10000,
    heartbeatOutgoing: 10000,
    debug: () => undefined,
    onConnect: () => {
      callbacks.onConnected?.()
      subscription = client.subscribe(options.topic ?? DEFAULT_TOPIC, (message) => {
        const snapshot = parseSnapshot(message)
        if (snapshot) {
          callbacks.onSnapshot(snapshot)
        }
      })
    },
    onWebSocketClose: () => {
      callbacks.onDisconnected?.()
    },
    onWebSocketError: () => {
      callbacks.onDisconnected?.()
    },
  })

  return {
    connect: () => {
      client.activate()
    },
    disconnect: () => {
      subscription?.unsubscribe()
      subscription = null
      client.deactivate()
    },
  }
}
