import { buildUnhandledErrorPayload, emitTelemetry, initializeTelemetryFromEnv } from './index'

type EmitTelemetry = typeof emitTelemetry

export function registerGlobalErrorHandlers(emit: EmitTelemetry = emitTelemetry): () => void {
  const onError = (event: Event) => {
    const errorEvent = event as ErrorEvent
    emit(
      'frontend.error.unhandled',
      buildUnhandledErrorPayload('error', errorEvent.error, errorEvent.message || 'Unhandled runtime error'),
    )
  }

  const onUnhandledRejection = (event: Event) => {
    const rejectionEvent = event as PromiseRejectionEvent
    emit(
      'frontend.error.unhandled',
      buildUnhandledErrorPayload(
        'unhandledrejection',
        rejectionEvent.reason,
        'Unhandled promise rejection',
      ),
    )
  }

  window.addEventListener('error', onError)
  window.addEventListener('unhandledrejection', onUnhandledRejection)

  return () => {
    window.removeEventListener('error', onError)
    window.removeEventListener('unhandledrejection', onUnhandledRejection)
  }
}

export function initializeFrontendObservability(): () => void {
  initializeTelemetryFromEnv()
  return registerGlobalErrorHandlers()
}

