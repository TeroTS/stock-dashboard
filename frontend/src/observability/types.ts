export type TelemetryEventName =
  | 'frontend.error.unhandled'
  | 'feed.lifecycle.transition'
  | 'feed.snapshot.received'
  | 'api.transaction.failure'

export type FeedLifecycleStatus = 'live' | 'reconnecting' | 'fallback'

export type FeedLifecycleReason =
  | 'snapshot_received'
  | 'disconnected'
  | 'retry_exhausted'
  | 'fallback_timeout'

export type ApiTransactionOperation = 'open' | 'close'

export interface FrontendUnhandledErrorPayload {
  kind: 'error' | 'unhandledrejection'
  component: 'global'
  errorClass: string
  message: string
  name?: string
}

export interface FeedLifecycleTransitionPayload {
  from: FeedLifecycleStatus
  to: FeedLifecycleStatus
  reason: FeedLifecycleReason
}

export interface FeedSnapshotReceivedPayload {
  sessionState: string
  cardsCount: number
  transactionsCount: number
}

export interface ApiTransactionFailurePayload {
  operation: ApiTransactionOperation
  errorClass: string
  message: string
  name?: string
  statusCode?: number
}

export interface TelemetryEventPayloadMap {
  'frontend.error.unhandled': FrontendUnhandledErrorPayload
  'feed.lifecycle.transition': FeedLifecycleTransitionPayload
  'feed.snapshot.received': FeedSnapshotReceivedPayload
  'api.transaction.failure': ApiTransactionFailurePayload
}

export interface TelemetryContext {
  app: 'stock-dashboard-frontend'
  env: string
  version: string
  sessionId: string
  path: string
}

export type TelemetryEnvelope<Name extends TelemetryEventName = TelemetryEventName> = TelemetryContext & {
  name: Name
  ts: string
  payload: TelemetryEventPayloadMap[Name]
}

