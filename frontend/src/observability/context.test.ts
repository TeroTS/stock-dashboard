import { beforeEach, describe, expect, it } from 'vitest'
import { __resetTelemetrySessionForTests, buildTelemetryContext } from './context'

describe('buildTelemetryContext', () => {
  beforeEach(() => {
    __resetTelemetrySessionForTests()
  })

  it('returns required context fields', () => {
    const context = buildTelemetryContext({
      env: 'test',
      version: '1.0.0',
      path: '/stocks',
    })

    expect(context.app).toBe('stock-dashboard-frontend')
    expect(context.env).toBe('test')
    expect(context.version).toBe('1.0.0')
    expect(context.path).toBe('/stocks')
    expect(context.sessionId).toMatch(/[a-z0-9-]{8,}/i)
  })

  it('reuses the same session id for subsequent calls', () => {
    const first = buildTelemetryContext({ env: 'test', version: '1.0.0', path: '/one' })
    const second = buildTelemetryContext({ env: 'test', version: '1.0.0', path: '/two' })

    expect(first.sessionId).toBe(second.sessionId)
  })
})
