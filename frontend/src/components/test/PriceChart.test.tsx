import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PriceChart } from '../PriceChart.tsx'
import type { LinePoint } from '../../types.ts'

const points: LinePoint[] = [
  { timestamp: 1784054638000, close: 211.18 },
  { timestamp: 1784054639000, close: 211.32 },
  { timestamp: 1784054640000, close: 211.25 },
]

describe('PriceChart', () => {
  it('renders marker dashes by point index', () => {
    render(
      <PriceChart
        symbol="AAPL"
        points={points}
        markers={[
          { key: 'entry', pointIndex: 0, tone: 'entry' },
          { key: 'exit', pointIndex: 2, tone: 'exit' },
        ]}
        testId="price-chart"
      />,
    )

    const chart = screen.getByTestId('price-chart')

    expect(chart.querySelectorAll('.price-chart-marker-dash')).toHaveLength(2)
    expect(chart.querySelectorAll('.price-chart-marker-entry')).toHaveLength(1)
    expect(chart.querySelectorAll('.price-chart-marker-exit')).toHaveLength(1)
    expect(chart.querySelectorAll('circle')).toHaveLength(0)
  })
})
