import { ConsoleTelemetryClient, NoopTelemetryClient, type TelemetryClient, createTelemetryClient } from './client'
import { buildTelemetryContext } from './context'
import type { TelemetryEnvelope, TelemetryEventName, TelemetryEventPayloadMap } from './types'

function toBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') {
    return value
  }

  if (typeof value === 'string') {
    return value.toLowerCase() === 'true'
  }

  return false
}

let telemetryClient: TelemetryClient = new NoopTelemetryClient()

export function setTelemetryClient(client: TelemetryClient): void {
  telemetryClient = client
}

export function initializeTelemetryFromEnv(): void {
  const enabled = toBoolean(import.meta.env.VITE_OBSERVABILITY_ENABLED)
  const provider = String(import.meta.env.VITE_OBSERVABILITY_PROVIDER ?? 'noop')
  const consoleTransport = toBoolean(import.meta.env.VITE_OBSERVABILITY_CONSOLE) || provider === 'console'

  telemetryClient = createTelemetryClient({
    enabled,
    consoleTransport,
  })
}

export function emitTelemetry<Name extends TelemetryEventName>(
  name: Name,
  payload: TelemetryEventPayloadMap[Name],
): void {
  const context = buildTelemetryContext({
    env: import.meta.env.MODE ?? 'unknown',
    version: String(import.meta.env.VITE_APP_VERSION ?? 'dev'),
    path: typeof window === 'undefined' ? 'unknown' : window.location.pathname,
  })

  const envelope: TelemetryEnvelope<Name> = {
    ...context,
    name,
    ts: new Date().toISOString(),
    payload,
  }

  telemetryClient.emit(envelope)
}

export { buildApiFailurePayload, buildUnhandledErrorPayload, sanitizeErrorInfo } from './sanitize'
export { ConsoleTelemetryClient, NoopTelemetryClient }
export type { TelemetryClient }

