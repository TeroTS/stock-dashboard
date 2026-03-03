import type {
  ApiTransactionFailurePayload,
  ApiTransactionOperation,
  FrontendUnhandledErrorPayload,
} from './types'

const MAX_MESSAGE_LENGTH = 240
const STATUS_CODE_PATTERN = /status\s+(\d{3})/i

function clampMessage(input: string): string {
  const trimmed = input.trim()
  if (trimmed.length === 0) {
    return 'Unknown error'
  }

  return trimmed.slice(0, MAX_MESSAGE_LENGTH)
}

function parseStatusCode(message: string): number | undefined {
  const match = message.match(STATUS_CODE_PATTERN)
  if (!match) {
    return undefined
  }

  const parsed = Number.parseInt(match[1], 10)
  if (Number.isNaN(parsed)) {
    return undefined
  }

  return parsed
}

export interface SanitizedErrorInfo {
  errorClass: string
  message: string
  name?: string
}

export function sanitizeErrorInfo(error: unknown, fallbackMessage = 'Unknown error'): SanitizedErrorInfo {
  if (error instanceof Error) {
    return {
      errorClass: error.name || 'Error',
      message: clampMessage(error.message || fallbackMessage),
      name: error.name || undefined,
    }
  }

  if (typeof error === 'string') {
    return {
      errorClass: 'UnknownError',
      message: clampMessage(error),
    }
  }

  return {
    errorClass: 'UnknownError',
    message: clampMessage(fallbackMessage),
  }
}

export function buildApiFailurePayload(
  operation: ApiTransactionOperation,
  error: unknown,
): ApiTransactionFailurePayload {
  const sanitized = sanitizeErrorInfo(error, 'Transaction API request failed')
  const statusCode = parseStatusCode(sanitized.message)

  return {
    operation,
    ...sanitized,
    ...(statusCode !== undefined ? { statusCode } : {}),
  }
}

export function buildUnhandledErrorPayload(
  kind: FrontendUnhandledErrorPayload['kind'],
  error: unknown,
  fallbackMessage: string,
): FrontendUnhandledErrorPayload {
  const sanitized = sanitizeErrorInfo(error, fallbackMessage)

  return {
    kind,
    component: 'global',
    ...sanitized,
  }
}

