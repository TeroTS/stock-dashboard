// Hook for transaction commands. Snapshot updates remain the authoritative read-model source.
import { useCallback } from 'react'
import type { PositionType } from '../types'
import { closeTransaction as closeTransactionApi, openTransaction as openTransactionApi } from './transactionsApi'

export interface TransactionCommands {
  openTransaction: (symbol: string, positionType: PositionType) => Promise<void>
  closeTransaction: (transactionId: string) => Promise<void>
}

export function useTransactionCommands(): TransactionCommands {
  const openTransaction = useCallback(async (symbol: string, positionType: PositionType): Promise<void> => {
    try {
      await openTransactionApi({ symbol, positionType })
    } catch {
      // The websocket snapshot remains the authoritative state source after command failures.
    }
  }, [])

  const closeTransaction = useCallback(async (transactionId: string): Promise<void> => {
    try {
      await closeTransactionApi(transactionId)
    } catch {
      // The websocket snapshot remains the authoritative state source after command failures.
    }
  }, [])

  return { openTransaction, closeTransaction }
}
