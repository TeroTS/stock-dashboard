import type { CandleSpec, GridLineSpec, StockCardModel } from '../types'
import type { CandleSnapshotDto, DashboardSnapshotDto, StockCardSnapshotDto } from './types'

const PLOT_BASE_WIDTH = 271.2
const PLOT_BASE_HEIGHT = 313
const HORIZONTAL_PADDING = 12
const VERTICAL_PADDING = 12

const DEFAULT_GRID_LINES: GridLineSpec[] = [
  { x: 12, y: 85, width: 248, height: 1 },
  { x: 12, y: 157, width: 248, height: 1 },
  { x: 12, y: 229, width: 248, height: 1 },
]

function uniqueBySymbol(cards: StockCardSnapshotDto[]): StockCardSnapshotDto[] {
  const seen = new Set<string>()

  return cards.filter((card) => {
    if (seen.has(card.symbol)) {
      return false
    }

    seen.add(card.symbol)
    return true
  })
}

function yForPrice(price: number, maxPrice: number, minPrice: number): number {
  const range = Math.max(maxPrice - minPrice, 0.0001)
  const drawableHeight = PLOT_BASE_HEIGHT - VERTICAL_PADDING * 2
  const normalized = (maxPrice - price) / range

  return VERTICAL_PADDING + normalized * drawableHeight
}

function toCandleSpec(candles: CandleSnapshotDto[]): CandleSpec[] {
  if (candles.length === 0) {
    return []
  }

  const maxPrice = Math.max(...candles.map((candle) => candle.high))
  const minPrice = Math.min(...candles.map((candle) => candle.low))

  const drawableWidth = PLOT_BASE_WIDTH - HORIZONTAL_PADDING * 2
  const step = drawableWidth / Math.max(candles.length, 1)
  const bodyWidth = Math.max(2, Math.min(6, step * 0.5))

  return candles.map((candle, index) => {
    const centerX = HORIZONTAL_PADDING + step * index + step / 2

    const openY = yForPrice(candle.open, maxPrice, minPrice)
    const closeY = yForPrice(candle.close, maxPrice, minPrice)
    const highY = yForPrice(candle.high, maxPrice, minPrice)
    const lowY = yForPrice(candle.low, maxPrice, minPrice)

    const bodyTop = Math.min(openY, closeY)
    const bodyHeight = Math.max(1, Math.abs(openY - closeY))
    const wickHeight = Math.max(1, lowY - highY)

    return {
      index: index + 1,
      body: {
        x: centerX - bodyWidth / 2,
        y: bodyTop,
        width: bodyWidth,
        height: bodyHeight,
        fill: candle.close >= candle.open ? '#22C55E' : '#EF4444',
      },
      wick: {
        x: centerX - 1,
        y: highY,
        width: 2,
        height: wickHeight,
        fill: '#94A3B8',
      },
    }
  })
}

function toCardModel(card: StockCardSnapshotDto): StockCardModel {
  const activeRangeCandles = card.candlesByRange[card.activeRange] ?? []

  return {
    symbol: card.symbol,
    timeRanges: card.timeRanges,
    activeRange: card.activeRange,
    yAxisLabels: card.yAxisLabels,
    xAxisLabels: card.xAxisLabels,
    gridLines: DEFAULT_GRID_LINES,
    candles: toCandleSpec(activeRangeCandles),
    buyLabel: card.buyLabel,
    shortLabel: card.shortLabel,
  }
}

export function mapSnapshotToStockCards(snapshot: DashboardSnapshotDto): StockCardModel[] {
  const merged = [...snapshot.topGainers, ...snapshot.topLosers]

  return uniqueBySymbol(merged).slice(0, 10).map(toCardModel)
}
