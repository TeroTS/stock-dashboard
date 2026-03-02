import type { CandleSpec, GridLineSpec, StockCardModel } from '../types'

export const DASHBOARD_TITLE = 'Real-Time Stock Dashboard'
export const DASHBOARD_SUBTITLE = 'Live candlestick view with quick trading actions'

export const STOCK_SYMBOLS = [
  'AAPL',
  'MSFT',
  'GOOGL',
  'AMZN',
  'TSLA',
  'NVDA',
  'META',
  'NFLX',
  'AMD',
  'INTC',
]

export const TIME_RANGES = ['5min', '30min', '120min']
export const ACTIVE_RANGE = '5min'
export const Y_AXIS_LABELS = ['25.00', '24.50', '24.00']
export const X_AXIS_LABELS = ['10:02', '10:16', '10:32', '10:48']

export const GRID_LINES: GridLineSpec[] = [
  { x: 12, y: 170, width: 248, height: 1 },
  { x: 12, y: 230, width: 248, height: 1 },
  { x: 12, y: 290, width: 248, height: 1 },
]

export const CANDLES: CandleSpec[] = [
  {
    index: 1,
    body: { x: 14, y: 242, width: 4, height: 27, fill: '#22C55E' },
    wick: { x: 15, y: 229, width: 2, height: 52, fill: '#94A3B8' },
  },
  {
    index: 2,
    body: { x: 22, y: 230, width: 4, height: 31, fill: '#22C55E' },
    wick: { x: 23, y: 221, width: 2, height: 62, fill: '#94A3B8' },
  },
  {
    index: 3,
    body: { x: 30, y: 214, width: 4, height: 21, fill: '#EF4444' },
    wick: { x: 31, y: 195, width: 2, height: 54, fill: '#94A3B8' },
  },
  {
    index: 4,
    body: { x: 38, y: 203, width: 4, height: 30, fill: '#22C55E' },
    wick: { x: 39, y: 185, width: 2, height: 69, fill: '#94A3B8' },
  },
  {
    index: 5,
    body: { x: 46, y: 226, width: 4, height: 26, fill: '#EF4444' },
    wick: { x: 47, y: 210, width: 2, height: 50, fill: '#94A3B8' },
  },
  {
    index: 6,
    body: { x: 54, y: 215, width: 4, height: 20, fill: '#EF4444' },
    wick: { x: 55, y: 196, width: 2, height: 55, fill: '#94A3B8' },
  },
  {
    index: 7,
    body: { x: 62, y: 228, width: 4, height: 20, fill: '#EF4444' },
    wick: { x: 63, y: 219, width: 2, height: 51, fill: '#94A3B8' },
  },
  {
    index: 8,
    body: { x: 70, y: 248, width: 4, height: 16, fill: '#EF4444' },
    wick: { x: 71, y: 239, width: 2, height: 41, fill: '#94A3B8' },
  },
  {
    index: 9,
    body: { x: 78, y: 247, width: 4, height: 34, fill: '#22C55E' },
    wick: { x: 79, y: 237, width: 2, height: 62, fill: '#94A3B8' },
  },
  {
    index: 10,
    body: { x: 86, y: 250, width: 4, height: 30, fill: '#22C55E' },
    wick: { x: 87, y: 242, width: 2, height: 52, fill: '#94A3B8' },
  },
  {
    index: 11,
    body: { x: 94, y: 249, width: 4, height: 32, fill: '#EF4444' },
    wick: { x: 95, y: 229, width: 2, height: 71, fill: '#94A3B8' },
  },
  {
    index: 12,
    body: { x: 102, y: 258, width: 4, height: 15, fill: '#22C55E' },
    wick: { x: 103, y: 245, width: 2, height: 45, fill: '#94A3B8' },
  },
  {
    index: 13,
    body: { x: 110, y: 230, width: 4, height: 26, fill: '#EF4444' },
    wick: { x: 111, y: 214, width: 2, height: 53, fill: '#94A3B8' },
  },
  {
    index: 14,
    body: { x: 118, y: 221, width: 4, height: 30, fill: '#22C55E' },
    wick: { x: 119, y: 213, width: 2, height: 50, fill: '#94A3B8' },
  },
  {
    index: 15,
    body: { x: 126, y: 207, width: 4, height: 22, fill: '#EF4444' },
    wick: { x: 127, y: 190, width: 2, height: 60, fill: '#94A3B8' },
  },
  {
    index: 16,
    body: { x: 134, y: 216, width: 4, height: 31, fill: '#22C55E' },
    wick: { x: 135, y: 206, width: 2, height: 53, fill: '#94A3B8' },
  },
  {
    index: 17,
    body: { x: 142, y: 240, width: 4, height: 23, fill: '#22C55E' },
    wick: { x: 143, y: 227, width: 2, height: 46, fill: '#94A3B8' },
  },
  {
    index: 18,
    body: { x: 150, y: 242, width: 4, height: 17, fill: '#22C55E' },
    wick: { x: 151, y: 225, width: 2, height: 54, fill: '#94A3B8' },
  },
  {
    index: 19,
    body: { x: 158, y: 233, width: 4, height: 24, fill: '#EF4444' },
    wick: { x: 159, y: 213, width: 2, height: 57, fill: '#94A3B8' },
  },
  {
    index: 20,
    body: { x: 166, y: 210, width: 4, height: 28, fill: '#22C55E' },
    wick: { x: 167, y: 195, width: 2, height: 61, fill: '#94A3B8' },
  },
  {
    index: 21,
    body: { x: 174, y: 195, width: 4, height: 20, fill: '#EF4444' },
    wick: { x: 175, y: 186, width: 2, height: 48, fill: '#94A3B8' },
  },
  {
    index: 22,
    body: { x: 182, y: 207, width: 4, height: 14, fill: '#22C55E' },
    wick: { x: 183, y: 191, width: 2, height: 48, fill: '#94A3B8' },
  },
  {
    index: 23,
    body: { x: 190, y: 187, width: 4, height: 26, fill: '#22C55E' },
    wick: { x: 191, y: 170, width: 2, height: 64, fill: '#94A3B8' },
  },
  {
    index: 24,
    body: { x: 198, y: 194, width: 4, height: 19, fill: '#EF4444' },
    wick: { x: 199, y: 182, width: 2, height: 41, fill: '#94A3B8' },
  },
  {
    index: 25,
    body: { x: 206, y: 216, width: 4, height: 17, fill: '#22C55E' },
    wick: { x: 207, y: 208, width: 2, height: 46, fill: '#94A3B8' },
  },
  {
    index: 26,
    body: { x: 214, y: 224, width: 4, height: 23, fill: '#22C55E' },
    wick: { x: 215, y: 211, width: 2, height: 56, fill: '#94A3B8' },
  },
  {
    index: 27,
    body: { x: 222, y: 226, width: 4, height: 15, fill: '#EF4444' },
    wick: { x: 223, y: 212, width: 2, height: 38, fill: '#94A3B8' },
  },
  {
    index: 28,
    body: { x: 230, y: 244, width: 4, height: 23, fill: '#22C55E' },
    wick: { x: 231, y: 226, width: 2, height: 55, fill: '#94A3B8' },
  },
  {
    index: 29,
    body: { x: 238, y: 256, width: 4, height: 16, fill: '#22C55E' },
    wick: { x: 239, y: 240, width: 2, height: 50, fill: '#94A3B8' },
  },
  {
    index: 30,
    body: { x: 246, y: 246, width: 4, height: 21, fill: '#22C55E' },
    wick: { x: 247, y: 234, width: 2, height: 50, fill: '#94A3B8' },
  },
]

export const STOCK_CARDS: StockCardModel[] = STOCK_SYMBOLS.map((symbol) => ({
  cardId: `static-${symbol}`,
  symbol,
  percentChange: 0,
  timeRanges: TIME_RANGES,
  activeRange: ACTIVE_RANGE,
  yAxisLabelsByRange: Object.fromEntries(TIME_RANGES.map((range) => [range, Y_AXIS_LABELS])),
  xAxisLabelsByRange: Object.fromEntries(TIME_RANGES.map((range) => [range, X_AXIS_LABELS])),
  gridLines: GRID_LINES,
  candlesByRange: Object.fromEntries(TIME_RANGES.map((range) => [range, CANDLES])),
  buyLabel: 'Buy',
  shortLabel: 'Short',
}))
