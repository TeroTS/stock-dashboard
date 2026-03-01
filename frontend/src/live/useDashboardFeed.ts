import { useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { STOCK_CARDS } from '../data/dashboardData'
import type { StockCardModel } from '../types'
import { connectionStateReducer, initialConnectionState } from './connectionState'
import { createDashboardFeedClient, type DashboardFeedClientFactory } from './dashboardFeedClient'
import { mapSnapshotToStockCards } from './mapSnapshotToCards'

interface UseDashboardFeedOptions {
  clientFactory?: DashboardFeedClientFactory
  fallbackAfterMs?: number
}

interface UseDashboardFeedResult {
  cards: StockCardModel[]
  status: 'live' | 'reconnecting' | 'fallback'
  updatedAt: string | null
  sessionState: string | null
}

export function useDashboardFeed(options: UseDashboardFeedOptions = {}): UseDashboardFeedResult {
  const { clientFactory = createDashboardFeedClient, fallbackAfterMs = 15000 } = options

  const [cards, setCards] = useState<StockCardModel[]>(STOCK_CARDS)
  const [updatedAt, setUpdatedAt] = useState<string | null>(null)
  const [sessionState, setSessionState] = useState<string | null>(null)
  const [connectionState, dispatch] = useReducer(connectionStateReducer, initialConnectionState)
  const fallbackTimerRef = useRef<number | null>(null)

  const callbacks = useMemo(
    () => ({
      onSnapshot: (snapshot: Parameters<typeof mapSnapshotToStockCards>[0]) => {
        if (fallbackTimerRef.current !== null) {
          window.clearTimeout(fallbackTimerRef.current)
          fallbackTimerRef.current = null
        }

        setCards(mapSnapshotToStockCards(snapshot))
        setUpdatedAt(snapshot.generatedAt)
        setSessionState(snapshot.sessionState)
        dispatch({ type: 'snapshot_received' })
      },
      onDisconnected: () => {
        dispatch({ type: 'disconnected' })

        if (fallbackTimerRef.current !== null) {
          window.clearTimeout(fallbackTimerRef.current)
        }

        fallbackTimerRef.current = window.setTimeout(() => {
          dispatch({ type: 'retry_exhausted' })
        }, fallbackAfterMs)
      },
      onFallback: () => {
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

  return {
    cards,
    status: connectionState.status,
    updatedAt,
    sessionState,
  }
}
