import { beforeEach, describe, expect, it, vi } from 'vitest'
import { registerGlobalErrorHandlers } from './bootstrap'

describe('registerGlobalErrorHandlers', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('captures and emits unhandled error and rejection events', () => {
    const listeners: Record<string, EventListener> = {}
    const addSpy = vi.spyOn(window, 'addEventListener').mockImplementation((type, listener) => {
      listeners[type] = listener as EventListener
    })
    const removeSpy = vi.spyOn(window, 'removeEventListener').mockImplementation(() => undefined)
    const emit = vi.fn()

    const cleanup = registerGlobalErrorHandlers(emit)

    listeners.error(new ErrorEvent('error', { message: 'boom', error: new Error('boom') }))
    listeners.unhandledrejection({ reason: new Error('rejected') } as unknown as Event)

    expect(emit).toHaveBeenCalledWith(
      'frontend.error.unhandled',
      expect.objectContaining({
        kind: 'error',
        message: 'boom',
        component: 'global',
      }),
    )
    expect(emit).toHaveBeenCalledWith(
      'frontend.error.unhandled',
      expect.objectContaining({
        kind: 'unhandledrejection',
        message: 'rejected',
        component: 'global',
      }),
    )

    cleanup()

    expect(addSpy).toHaveBeenCalledTimes(2)
    expect(removeSpy).toHaveBeenCalledTimes(2)
  })
})
