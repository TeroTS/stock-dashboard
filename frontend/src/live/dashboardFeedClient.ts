// Plain browser WebSocket client for full-snapshot dashboard updates.
import type { DashboardSnapshotDto } from './types'

export interface DashboardFeedCallbacks {
  onConnected?: () => void
  onSnapshot: (snapshot: DashboardSnapshotDto) => void
  onDisconnected?: () => void
}

export interface DashboardFeedClient {
  connect: () => void
  disconnect: () => void
}

export interface DashboardFeedClientOptions {
  wsUrl: string
}

export type DashboardFeedClientFactory = (
  callbacks: DashboardFeedCallbacks,
  options?: Partial<DashboardFeedClientOptions>,
) => DashboardFeedClient

const DEFAULT_WS_URL = import.meta.env.VITE_WS_URL ?? 'ws://localhost:8080/ws'

// Ignore malformed frames and keep the last good snapshot as the source of truth.
function parseSnapshot(data: string): DashboardSnapshotDto | null {
  try {
    return JSON.parse(data) as DashboardSnapshotDto
  } catch {
    return null
  }
}

export const createDashboardFeedClient: DashboardFeedClientFactory = (callbacks, options = {}) => {
  let socket: WebSocket | null = null

  return {
    connect: () => {
      socket = new WebSocket(options.wsUrl ?? DEFAULT_WS_URL)
      const handleDisconnect = () => {
        callbacks.onDisconnected?.()
      }

      socket.onopen = () => {
        callbacks.onConnected?.()
      }
      socket.onmessage = (event) => {
        const snapshot = parseSnapshot(String(event.data))
        if (!snapshot) {
          return
        }

        callbacks.onSnapshot(snapshot)
      }
      socket.onclose = handleDisconnect
      socket.onerror = handleDisconnect
    },
    disconnect: () => {
      socket?.close()
      socket = null
    },
  }
}
