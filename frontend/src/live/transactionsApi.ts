import type { PositionType } from '../types'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080'

interface OpenTransactionRequest {
  symbol: string
  positionType: PositionType
}

interface TransactionMutationResult {
  transactionId: string
}

async function request<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init)
  if (!response.ok) {
    throw new Error(`Transaction API request failed with status ${response.status}`)
  }

  return (await response.json()) as T
}

export function openTransaction(requestBody: OpenTransactionRequest): Promise<TransactionMutationResult> {
  return request<TransactionMutationResult>(`${API_BASE_URL}/api/transactions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  })
}

export function closeTransaction(transactionId: string): Promise<TransactionMutationResult> {
  return request<TransactionMutationResult>(`${API_BASE_URL}/api/transactions/${transactionId}/close`, {
    method: 'POST',
  })
}
