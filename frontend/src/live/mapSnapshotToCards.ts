// Clone snapshot arrays before storing them in UI state so later mutations cannot leak across views.
import type { StockCardModel, TransactionCardModel } from '../types'
import type { DashboardSnapshotPointDto, DashboardSnapshotStockDto, DashboardSnapshotTransactionDto } from './types'

function mapPoint(point: DashboardSnapshotPointDto) {
  return { ...point }
}

export function mapSnapshotToStockCards(cards: DashboardSnapshotStockDto[]): StockCardModel[] {
  return cards.map((card) => ({
    ...card,
    points: card.points.map(mapPoint),
  }))
}

// Pending opens sort by submission time because they do not have an opened timestamp yet.
function sortTimestamp(transaction: DashboardSnapshotTransactionDto): number {
  return transaction.openedAt ?? transaction.submittedAt
}

export function mapSnapshotToTransactions(transactions: DashboardSnapshotTransactionDto[]): TransactionCardModel[] {
  return [...transactions]
    .sort((left, right) => sortTimestamp(right) - sortTimestamp(left))
    .map((transaction) => ({
      ...transaction,
      points: transaction.points.map(mapPoint),
    }))
}
