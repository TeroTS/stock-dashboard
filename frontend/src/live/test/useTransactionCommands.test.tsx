import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

const apiMocks = vi.hoisted(() => ({
  openTransactionApi: vi.fn(),
  closeTransactionApi: vi.fn(),
  cancelOpenTransactionApi: vi.fn(),
}))

vi.mock('../transactionsApi.ts', () => ({
  openTransaction: apiMocks.openTransactionApi,
  closeTransaction: apiMocks.closeTransactionApi,
  cancelOpenTransaction: apiMocks.cancelOpenTransactionApi,
}))

import { useTransactionCommands } from '../useTransactionCommands.ts'

describe('useTransactionCommands', () => {
  it('swallows transaction command failures', async () => {
    apiMocks.openTransactionApi.mockRejectedValueOnce(new Error('open failed'))
    apiMocks.closeTransactionApi.mockRejectedValueOnce(new Error('close failed'))
    apiMocks.cancelOpenTransactionApi.mockRejectedValueOnce(new Error('cancel failed'))
    const { result } = renderHook(() => useTransactionCommands())

    await act(async () => {
      await expect(result.current.openTransaction('AAPL', 'LONG')).resolves.toBeUndefined()
      await expect(result.current.closeTransaction('tx-1')).resolves.toBeUndefined()
      await expect(result.current.cancelOpenTransaction('tx-2')).resolves.toBeUndefined()
    })
  })
})
