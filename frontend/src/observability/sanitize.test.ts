import { describe, expect, it } from 'vitest'
import { buildApiFailurePayload, buildUnhandledErrorPayload, sanitizeErrorInfo } from './sanitize'

describe('sanitize observability payloads', () => {
  it('returns strict allowlisted error info', () => {
    const result = sanitizeErrorInfo(new Error('boom'))

    expect(result).toEqual({
      errorClass: 'Error',
      message: 'boom',
      name: 'Error',
    })
    expect((result as unknown as Record<string, unknown>).stack).toBeUndefined()
  })

  it('builds api failure payload with parsed status code', () => {
    const payload = buildApiFailurePayload('open', new Error('Transaction API request failed with status 503'))

    expect(payload).toEqual({
      operation: 'open',
      errorClass: 'Error',
      message: 'Transaction API request failed with status 503',
      name: 'Error',
      statusCode: 503,
    })
  })

  it('builds unhandled payload from unknown reasons', () => {
    const payload = buildUnhandledErrorPayload('unhandledrejection', { foo: 'bar' }, 'fallback')

    expect(payload).toEqual({
      kind: 'unhandledrejection',
      component: 'global',
      errorClass: 'UnknownError',
      message: 'fallback',
    })
  })
})
