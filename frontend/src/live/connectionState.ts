import type { LiveConnectionStatus } from './types'

export interface ConnectionState {
  status: LiveConnectionStatus
}

export type ConnectionEvent =
  | { type: 'connected' }
  | { type: 'snapshot_received' }
  | { type: 'disconnected' }
  | { type: 'retry_exhausted' }

export const initialConnectionState: ConnectionState = {
  status: 'fallback',
}

export function connectionStateReducer(
  state: ConnectionState,
  event: ConnectionEvent,
): ConnectionState {
  switch (event.type) {
    case 'connected':
      return {
        status: 'connected',
      }
    case 'snapshot_received':
      return {
        status: 'live',
      }
    case 'disconnected':
      return {
        status: 'reconnecting',
      }
    case 'retry_exhausted':
      return {
        status: 'fallback',
      }
    default:
      return state
  }
}
