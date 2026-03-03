import type { TelemetryEnvelope } from './types'

export interface TelemetryClient {
  emit: (event: TelemetryEnvelope) => void
}

export interface TelemetryClientConfig {
  enabled: boolean
  consoleTransport: boolean
}

export class NoopTelemetryClient implements TelemetryClient {
  emit(event: TelemetryEnvelope): void {
    void event
    // Intentionally no-op by default.
  }
}

export class ConsoleTelemetryClient implements TelemetryClient {
  emit(event: TelemetryEnvelope): void {
    console.info('[telemetry]', event)
  }
}

export function createTelemetryClient(config: TelemetryClientConfig): TelemetryClient {
  if (!config.enabled || !config.consoleTransport) {
    return new NoopTelemetryClient()
  }

  return new ConsoleTelemetryClient()
}
