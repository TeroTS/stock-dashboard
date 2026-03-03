import type { TelemetryContext } from './types'

const APP_NAME = 'stock-dashboard-frontend' as const
let cachedSessionId: string | null = null

interface BuildTelemetryContextInput {
  env: string
  version: string
  path: string
}

function createSessionId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `session-${Math.random().toString(36).slice(2, 12)}`
}

export function buildTelemetryContext(input: BuildTelemetryContextInput): TelemetryContext {
  if (cachedSessionId === null) {
    cachedSessionId = createSessionId()
  }

  return {
    app: APP_NAME,
    env: input.env,
    version: input.version,
    sessionId: cachedSessionId,
    path: input.path,
  }
}

export function __resetTelemetrySessionForTests(): void {
  cachedSessionId = null
}

