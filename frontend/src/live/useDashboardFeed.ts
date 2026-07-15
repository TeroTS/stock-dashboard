// Hook that keeps the dashboard read model aligned with websocket snapshots.
import { useEffect, useMemo, useReducer, useRef, useState } from 'react'
import type { PositionType, StockCardModel, TransactionCardModel } from '../types'
import { connectionStateReducer, initialConnectionState } from './connectionState'
import { createDashboardFeedClient, type DashboardFeedClientFactory } from './dashboardFeedClient'
import { mapSnapshotToStockCards, mapSnapshotToTransactions } from './mapSnapshotToCards'
import type { DashboardSnapshotDto } from './types'
import { useTransactionCommands } from './useTransactionCommands'

interface UseDashboardFeedOptions {
  clientFactory?: DashboardFeedClientFactory
  fallbackAfterMs?: number
}

interface UseDashboardFeedResult {
  topGainers: StockCardModel[]
  topLosers: StockCardModel[]
  transactions: TransactionCardModel[]
  status: 'live' | 'reconnecting' | 'fallback'
  updatedAt: number | null
  openTransaction: (symbol: string, positionType: PositionType) => Promise<void>
  closeTransaction: (transactionId: string) => Promise<void>
}

export function useDashboardFeed(options: UseDashboardFeedOptions = {}): UseDashboardFeedResult {
  const { clientFactory = createDashboardFeedClient, fallbackAfterMs = 15000 } = options

  const [topGainers, setTopGainers] = useState<StockCardModel[]>([])
  const [topLosers, setTopLosers] = useState<StockCardModel[]>([])
  const [transactions, setTransactions] = useState<TransactionCardModel[]>([])
  const [updatedAt, setUpdatedAt] = useState<number | null>(null)
  const [connectionState, dispatch] = useReducer(connectionStateReducer, initialConnectionState)
  const fallbackTimerRef = useRef<number | null>(null)

  const callbacks = useMemo(
    () => ({
      // Replace the whole read model on every snapshot because the backend contract is full-state, not patches.
      onSnapshot: (snapshot: DashboardSnapshotDto) => {
        if (fallbackTimerRef.current !== null) {
          window.clearTimeout(fallbackTimerRef.current)
          fallbackTimerRef.current = null
        }

        const mappedGainers = mapSnapshotToStockCards(snapshot.topGainers)
        const mappedLosers = mapSnapshotToStockCards(snapshot.topLosers)
        const mappedTransactions = mapSnapshotToTransactions(snapshot.transactions)
        setTopGainers(mappedGainers)
        setTopLosers(mappedLosers)
        setTransactions(mappedTransactions)
        setUpdatedAt(snapshot.updatedAt)

        dispatch({ type: 'snapshot_received' })
      },
      onDisconnected: () => {
        dispatch({ type: 'disconnected' })

        if (fallbackTimerRef.current !== null) {
          window.clearTimeout(fallbackTimerRef.current)
        }

        // Stay in reconnecting briefly so transient socket drops do not flash fallback UI immediately.
        fallbackTimerRef.current = window.setTimeout(() => {
          dispatch({ type: 'retry_exhausted' })
        }, fallbackAfterMs)
      },
    }),
    [fallbackAfterMs],
  )

  useEffect(() => {
    const client = clientFactory(callbacks)
    client.connect()

    return () => {
      if (fallbackTimerRef.current !== null) {
        window.clearTimeout(fallbackTimerRef.current)
      }
      client.disconnect()
    }
  }, [callbacks, clientFactory])

  const { openTransaction, closeTransaction } = useTransactionCommands()

  return {
    topGainers,
    topLosers,
    transactions,
    status: connectionState.status,
    updatedAt,
    openTransaction,
    closeTransaction,
  }
}
