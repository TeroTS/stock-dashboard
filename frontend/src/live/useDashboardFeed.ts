import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { STOCK_CARDS } from '../data/dashboardData'
import type { PositionType, StockCardModel, TransactionCardModel } from '../types'
import { connectionStateReducer, initialConnectionState } from './connectionState'
import { createDashboardFeedClient, type DashboardFeedClientFactory } from './dashboardFeedClient'
import { mapSnapshotToStockCards, mapSnapshotToTransactions } from './mapSnapshotToCards'
import { closeTransaction as closeTransactionApi, openTransaction as openTransactionApi } from './transactionsApi'
import { buildApiFailurePayload, emitTelemetry } from '../observability'

interface UseDashboardFeedOptions {
  clientFactory?: DashboardFeedClientFactory
  fallbackAfterMs?: number
}

interface UseDashboardFeedResult {
  cards: StockCardModel[]
  transactions: TransactionCardModel[]
  status: 'live' | 'reconnecting' | 'fallback'
  updatedAt: string | null
  sessionState: string | null
  openTransaction: (symbol: string, positionType: PositionType) => Promise<void>
  closeTransaction: (transactionId: string) => Promise<void>
}

export function useDashboardFeed(options: UseDashboardFeedOptions = {}): UseDashboardFeedResult {
  const { clientFactory = createDashboardFeedClient, fallbackAfterMs = 15000 } = options

  const [cards, setCards] = useState<StockCardModel[]>(STOCK_CARDS)
  const [transactions, setTransactions] = useState<TransactionCardModel[]>([])
  const [updatedAt, setUpdatedAt] = useState<string | null>(null)
  const [sessionState, setSessionState] = useState<string | null>(null)
  const [connectionState, dispatch] = useReducer(connectionStateReducer, initialConnectionState)
  const fallbackTimerRef = useRef<number | null>(null)
  const connectionStatusRef = useRef(connectionState.status)

  useEffect(() => {
    connectionStatusRef.current = connectionState.status
  }, [connectionState.status])

  const callbacks = useMemo(
    () => ({
      onSnapshot: (snapshot: Parameters<typeof mapSnapshotToStockCards>[0]) => {
        if (fallbackTimerRef.current !== null) {
          window.clearTimeout(fallbackTimerRef.current)
          fallbackTimerRef.current = null
        }

        const mappedCards = mapSnapshotToStockCards(snapshot)
        const mappedTransactions = mapSnapshotToTransactions(snapshot)
        setCards(mappedCards)
        setTransactions(mappedTransactions)
        setUpdatedAt(snapshot.generatedAt)
        setSessionState(snapshot.sessionState)

        if (connectionStatusRef.current !== 'live') {
          emitTelemetry('feed.lifecycle.transition', {
            from: connectionStatusRef.current,
            to: 'live',
            reason: 'snapshot_received',
          })
        }
        emitTelemetry('feed.snapshot.received', {
          sessionState: snapshot.sessionState,
          cardsCount: mappedCards.length,
          transactionsCount: mappedTransactions.length,
        })
        dispatch({ type: 'snapshot_received' })
      },
      onDisconnected: () => {
        emitTelemetry('feed.lifecycle.transition', {
          from: connectionStatusRef.current,
          to: 'reconnecting',
          reason: 'disconnected',
        })
        dispatch({ type: 'disconnected' })

        if (fallbackTimerRef.current !== null) {
          window.clearTimeout(fallbackTimerRef.current)
        }

        fallbackTimerRef.current = window.setTimeout(() => {
          emitTelemetry('feed.lifecycle.transition', {
            from: 'reconnecting',
            to: 'fallback',
            reason: 'retry_exhausted',
          })
          dispatch({ type: 'retry_exhausted' })
        }, fallbackAfterMs)
      },
      onFallback: () => {
        emitTelemetry('feed.lifecycle.transition', {
          from: connectionStatusRef.current,
          to: 'fallback',
          reason: 'retry_exhausted',
        })
        dispatch({ type: 'retry_exhausted' })
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

  const handleOpenTransaction = useCallback(async (symbol: string, positionType: PositionType) => {
    try {
      await openTransactionApi({ symbol, positionType })
    } catch (error) {
      emitTelemetry('api.transaction.failure', buildApiFailurePayload('open', error))
      // Keep the live feed running; next snapshots remain source of truth.
    }
  }, [])

  const handleCloseTransaction = useCallback(async (transactionId: string) => {
    try {
      await closeTransactionApi(transactionId)
    } catch (error) {
      emitTelemetry('api.transaction.failure', buildApiFailurePayload('close', error))
      // Keep the live feed running; next snapshots remain source of truth.
    }
  }, [])

  return {
    cards,
    transactions,
    status: connectionState.status,
    updatedAt,
    sessionState,
    openTransaction: handleOpenTransaction,
    closeTransaction: handleCloseTransaction,
  }
}
