// Clone snapshot arrays before storing them in UI state so later mutations cannot leak across views.
import type { StockCardModel, TransactionCardModel } from '../types'

export function mapSnapshotToStockCards(cards: StockCardModel[]): StockCardModel[] {
  return cards.map((card) => ({
    ...card,
    points: [...card.points],
  }))
}

// Pending opens sort by submission time because they do not have an opened timestamp yet.
function sortTimestamp(transaction: TransactionCardModel): number {
  return transaction.openedAt ?? transaction.submittedAt
}

export function mapSnapshotToTransactions(transactions: TransactionCardModel[]): TransactionCardModel[] {
  return [...transactions]
    .sort((left, right) => sortTimestamp(right) - sortTimestamp(left))
    .map((transaction) => ({
      ...transaction,
      points: [...transaction.points],
    }))
}
