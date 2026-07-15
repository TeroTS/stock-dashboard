// Hook for transaction commands. Snapshot updates remain the authoritative read-model source.
import { useCallback } from 'react'
import type { PositionType } from '../types'
import {
  cancelOpenTransaction as cancelOpenTransactionApi,
  closeTransaction as closeTransactionApi,
  openTransaction as openTransactionApi,
} from './transactionsApi'

export interface TransactionCommands {
  openTransaction: (symbol: string, positionType: PositionType) => Promise<void>
  closeTransaction: (transactionId: string) => Promise<void>
  cancelOpenTransaction: (transactionId: string) => Promise<void>
}

export function useTransactionCommands(): TransactionCommands {
  const runCommand = useCallback(async (command: () => Promise<unknown>): Promise<void> => {
    try {
      await command()
    } catch {
      // The websocket snapshot remains the authoritative state source after command failures.
    }
  }, [])

  const openTransaction = useCallback(
    async (symbol: string, positionType: PositionType): Promise<void> => {
      await runCommand(() => openTransactionApi({ symbol, positionType }))
    },
    [runCommand],
  )

  const closeTransaction = useCallback(async (transactionId: string): Promise<void> => {
    await runCommand(() => closeTransactionApi(transactionId))
  }, [runCommand])

  const cancelOpenTransaction = useCallback(async (transactionId: string): Promise<void> => {
    await runCommand(() => cancelOpenTransactionApi(transactionId))
  }, [runCommand])

  return { openTransaction, closeTransaction, cancelOpenTransaction }
}
