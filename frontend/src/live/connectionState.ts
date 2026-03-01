import type { LiveConnectionStatus } from './types'

export interface ConnectionState {
  status: LiveConnectionStatus
  retries: number
  hadLiveSnapshot: boolean
}

export type ConnectionEvent =
  | { type: 'snapshot_received' }
  | { type: 'disconnected' }
  | { type: 'retry_scheduled' }
  | { type: 'retry_exhausted' }

export const initialConnectionState: ConnectionState = {
  status: 'fallback',
  retries: 0,
  hadLiveSnapshot: false,
}

export function connectionStateReducer(
  state: ConnectionState,
  event: ConnectionEvent,
): ConnectionState {
  switch (event.type) {
    case 'snapshot_received':
      return {
        status: 'live',
        retries: 0,
        hadLiveSnapshot: true,
      }
    case 'disconnected':
      return {
        ...state,
        status: 'reconnecting',
      }
    case 'retry_scheduled':
      return {
        ...state,
        status: 'reconnecting',
        retries: state.retries + 1,
      }
    case 'retry_exhausted':
      return {
        ...state,
        status: 'fallback',
      }
    default:
      return state
  }
}
