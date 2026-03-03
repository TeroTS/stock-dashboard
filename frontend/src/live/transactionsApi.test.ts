import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { closeTransaction, openTransaction } from './transactionsApi'

describe('transactionsApi', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    fetchMock.mockReset()
  })

  it('opens a transaction via POST and returns the parsed response', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ transactionId: 'tx-open' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    const result = await openTransaction({ symbol: 'AAPL', positionType: 'LONG' })

    expect(result).toEqual({ transactionId: 'tx-open' })
    expect(fetchMock).toHaveBeenCalledWith('http://localhost:8080/api/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbol: 'AAPL', positionType: 'LONG' }),
    })
  })

  it('throws when opening transaction fails', async () => {
    fetchMock.mockResolvedValue(new Response('server error', { status: 500 }))

    await expect(openTransaction({ symbol: 'AAPL', positionType: 'LONG' })).rejects.toThrow(
      'Transaction API request failed with status 500',
    )
  })

  it('closes a transaction via POST and returns the parsed response', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ transactionId: 'tx-close' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    const result = await closeTransaction('tx-close')

    expect(result).toEqual({ transactionId: 'tx-close' })
    expect(fetchMock).toHaveBeenCalledWith('http://localhost:8080/api/transactions/tx-close/close', {
      method: 'POST',
    })
  })

  it('throws when closing transaction fails', async () => {
    fetchMock.mockResolvedValue(new Response('not found', { status: 404 }))

    await expect(closeTransaction('tx-missing')).rejects.toThrow(
      'Transaction API request failed with status 404',
    )
  })
})
