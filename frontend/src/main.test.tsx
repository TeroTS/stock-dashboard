import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  render: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
}))

vi.mock('react-dom/client', () => ({
  createRoot: () => ({ render: mocks.render }),
}))

vi.mock('./App.tsx', () => ({
  default: () => null,
}))

describe('main bootstrap', () => {
  beforeEach(() => {
    vi.resetModules()
    mocks.render.mockReset()
    mocks.addEventListener.mockReset()
    mocks.removeEventListener.mockReset()
    vi.stubGlobal('addEventListener', mocks.addEventListener)
    vi.stubGlobal('removeEventListener', mocks.removeEventListener)
  })

  it('does not register global frontend telemetry handlers during startup', async () => {
    await import('./main.tsx')

    expect(mocks.addEventListener).not.toHaveBeenCalledWith('error', expect.any(Function))
    expect(mocks.addEventListener).not.toHaveBeenCalledWith('unhandledrejection', expect.any(Function))
  })
})
