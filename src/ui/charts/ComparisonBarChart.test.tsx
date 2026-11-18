import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { ComparisonPoint } from '../../api/types.ts'
import { BAR_TICKS } from '../../lib/chartScale.ts'
import { chartColorVars } from './chartColors.ts'
import { ChartLegend } from './ChartLegend.tsx'
import { ComparisonBarChart } from './ComparisonBarChart.tsx'

const root = document.documentElement

beforeEach(() => {
  root.style.setProperty(chartColorVars.current, 'teal')
  root.style.setProperty(chartColorVars.previous, 'silver')
  root.style.setProperty(chartColorVars.grid, 'gainsboro')
})

afterEach(() => {
  for (const name of Object.values(chartColorVars)) root.style.removeProperty(name)
})

const points: ComparisonPoint[] = [
  { label: '14 Sun', currentCents: 2_000_00, previousCents: 1_000_00 },
  { label: '15 Mon', currentCents: 0, previousCents: 300_000_00 },
  { label: '16 Tue', currentCents: null, previousCents: 6_000_00 },
]

function renderChart() {
  return render(<ComparisonBarChart points={points} summary="Weekly spending summary" ticksCents={BAR_TICKS} initialWidth={600} />)
}

describe('ComparisonBarChart', () => {
  it('renders the summary as text and hides the SVG from assistive technology', () => {
    renderChart()
    expect(screen.getByText('Weekly spending summary')).toHaveClass('sr-only')
    const chart = screen.getByTestId('comparison-chart')
    expect(chart).toHaveAttribute('aria-hidden', 'true')
    expect(chart.querySelector('svg')).not.toBeNull()
  })

  it('labels the Y axis with the compact ticks and the X axis with the point labels', () => {
    const { container } = renderChart()
    const texts = [...container.querySelectorAll('.recharts-cartesian-axis-tick-value')].map((t) => t.textContent)
    expect(texts).toEqual(expect.arrayContaining(['$0', '$2k', '$10k', '$50k', '$250k', '14 Sun', '15 Mon', '16 Tue']))
    for (const tick of container.querySelectorAll('.recharts-cartesian-axis-tick-value')) {
      expect(tick).toHaveClass('fill-subtle', 'text-14')
    }
  })

  it('draws horizontal gridlines only, in the grid colour', () => {
    const { container } = renderChart()
    expect(container.querySelectorAll('.recharts-cartesian-grid-vertical line')).toHaveLength(0)
    const lines = container.querySelectorAll('.recharts-cartesian-grid-horizontal line')
    expect(lines).toHaveLength(5)
    for (const line of lines) expect(line).toHaveAttribute('stroke', 'gainsboro')
  })

  it('draws 16px bars on the tick scale in the chart colours, 8px apart, with no bar for null or zero', () => {
    const { container } = renderChart()
    const bars = [...container.querySelectorAll('.recharts-bar-rectangle path')]
    const by = (fill: string) => bars.filter((bar) => bar.getAttribute('fill') === fill)
    // The plot is 144px tall for 4 tick steps: $1k is half a step (18px), $6k one and a half (54px),
    // $300k is clamped to the top. 16 Tue is null and 15 Mon is zero, so only 14 Sun has a teal bar.
    expect(by('silver').map((bar) => bar.getAttribute('height'))).toEqual(['18', '144', '54'])
    expect(by('teal').map((bar) => bar.getAttribute('height'))).toEqual(['36'])
    for (const bar of bars) expect(bar).toHaveAttribute('width', '16')
    const gap = Number(by('teal')[0]!.getAttribute('x')) - Number(by('silver')[0]!.getAttribute('x')) - 16
    expect(gap).toBe(8)
  })
})

describe('ChartLegend', () => {
  it('shows a 16×8 swatch before each text-12 label', () => {
    render(
      <ChartLegend
        items={[
          { label: 'This week', tone: 'current' },
          { label: 'Last week', tone: 'previous' },
        ]}
      />,
    )
    const items = screen.getAllByRole('listitem')
    expect(items.map((li) => li.textContent)).toEqual(['This week', 'Last week'])
    expect(items[0]).toHaveClass('text-12')
    expect(screen.getByTestId('swatch-current')).toHaveClass('h-2', 'w-4', 'bg-chart-current')
    expect(screen.getByTestId('swatch-previous')).toHaveClass('h-2', 'w-4', 'bg-chart-previous')
    expect(screen.getByTestId('swatch-current')).toHaveAttribute('aria-hidden', 'true')
    expect(screen.getByRole('list')).toHaveClass('gap-6')
  })

  it('spaces items 34px apart with the wide spacing', () => {
    render(<ChartLegend items={[{ label: 'This month', tone: 'current' }]} spacing="wide" />)
    expect(screen.getByRole('list')).toHaveClass('gap-[34px]')
  })
})
