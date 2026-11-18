import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { IsoDate, SavingSummaryPoint } from '../../api/types.ts'
import { SAVING_TICKS } from '../../lib/chartScale.ts'
import { chartColorVars } from './chartColors.ts'
import { ComparisonAreaChart } from './ComparisonAreaChart.tsx'

const root = document.documentElement

beforeEach(() => {
  root.style.setProperty(chartColorVars.current, 'teal')
  root.style.setProperty(chartColorVars.previous, 'silver')
  root.style.setProperty(chartColorVars.grid, 'gainsboro')
})

afterEach(() => {
  for (const name of Object.values(chartColorVars)) root.style.removeProperty(name)
})

/** May 2023: days 1–19 have current values, 20–31 are null; day 31 has no previous value. */
const points: SavingSummaryPoint[] = Array.from({ length: 31 }, (_, i) => ({
  date: `2023-05-${String(i + 1).padStart(2, '0')}` as IsoDate,
  currentCents: i < 19 ? 50_000 + i * 1_000 : null,
  previousCents: i < 30 ? 40_000 : null,
}))

function renderChart(data: readonly SavingSummaryPoint[] = points) {
  return render(<ComparisonAreaChart points={data} summary="Saving summary text" ticksCents={SAVING_TICKS} initialWidth={664} />)
}

/** Every x,y coordinate pair of an SVG path (move, line and curve commands). */
function pathPoints(d: string): { x: number; y: number }[] {
  return [...d.matchAll(/(-?[\d.]+(?:e-?\d+)?),(-?[\d.]+(?:e-?\d+)?)/g)].map((m) => ({ x: Number(m[1]), y: Number(m[2]) }))
}

/** The y positions of the y-axis tick labels. */
const yTickYs = (container: HTMLElement) =>
  [...container.querySelectorAll('text[orientation="left"].recharts-cartesian-axis-tick-value')].map((t) =>
    Number(t.getAttribute('y')),
  )

describe('ComparisonAreaChart', () => {
  it('renders the summary as text and hides the SVG from assistive technology', () => {
    renderChart()
    expect(screen.getByText('Saving summary text')).toHaveClass('sr-only')
    const chart = screen.getByTestId('comparison-area-chart')
    expect(chart).toHaveAttribute('aria-hidden', 'true')
    expect(chart.querySelector('svg')).not.toBeNull()
  })

  it('labels day 1 and every 5th day on the x axis and $0/$500/$2000/$5000 on the y axis', () => {
    const { container } = renderChart()
    const texts = [...container.querySelectorAll('.recharts-cartesian-axis-tick-value')].map((t) => t.textContent)
    expect(texts).toEqual([
      'May 01',
      'May 05',
      'May 10',
      'May 15',
      'May 20',
      'May 25',
      'May 30',
      '$0',
      '$500',
      '$2000',
      '$5000',
    ])
    for (const tick of container.querySelectorAll('.recharts-cartesian-axis-tick-value')) {
      expect(tick).toHaveClass('fill-subtle', 'text-14')
    }
  })

  it('draws vertical gridlines at the x ticks only, in the grid colour', () => {
    const { container } = renderChart()
    expect(container.querySelectorAll('.recharts-cartesian-grid-horizontal line')).toHaveLength(0)
    const lines = [...container.querySelectorAll('.recharts-cartesian-grid-vertical line')]
    expect(lines).toHaveLength(7)
    for (const line of lines) expect(line).toHaveAttribute('stroke', 'gainsboro')
  })

  it('draws the current series as a teal line over a teal gradient and the previous one grey and dashed', () => {
    const { container } = renderChart()
    const area = container.querySelector('.recharts-area')!
    const curve = area.querySelector('.recharts-area-curve')!
    expect(curve).toHaveAttribute('stroke', 'teal')
    const fill = area.querySelector('.recharts-area-area')!.getAttribute('fill')!
    const id = /^url\(#(.+)\)$/.exec(fill)![1]!
    const stops = container.querySelectorAll(`linearGradient[id="${id}"] stop`)
    expect([...stops].map((s) => s.getAttribute('stop-color'))).toEqual(['teal', 'teal'])
    const dashed = container.querySelector('.recharts-line-curve')!
    expect(dashed).toHaveAttribute('stroke', 'silver')
    expect(dashed).toHaveAttribute('stroke-dasharray', '5 2')
  })

  it('leaves null days as gaps instead of drawing them at 0', () => {
    const { container } = renderChart()
    const gridXs = [...container.querySelectorAll('.recharts-cartesian-grid-vertical line')].map((l) =>
      Number(l.getAttribute('x1')),
    )
    // Gridlines sit at days 1, 5 … 30: the 20th day is at gridXs[4], the 30th at gridXs[6].
    const current = pathPoints(container.querySelector('.recharts-area-curve')!.getAttribute('d')!)
    expect(Math.max(...current.map((p) => p.x))).toBeLessThan(gridXs[4]!)
    const previous = pathPoints(container.querySelector('.recharts-line-curve')!.getAttribute('d')!)
    expect(Math.max(...previous.map((p) => p.x))).toBeCloseTo(gridXs[6]!, 5)
    // No drawn point of either series falls to the $0 baseline.
    const plotBottom = Math.max(...yTickYs(container))
    for (const p of [...current, ...previous]) expect(p.y).toBeLessThan(plotBottom)
  })

  it.each([
    ['on the $500 tick', 50_000, (ys: number[]) => ys[1]!],
    ['midway between the $500 and $2000 ticks', 125_000, (ys: number[]) => (ys[1]! + ys[2]!) / 2],
  ])('places a value %s, for the area curve and the dashed line', (_name, cents, expectedY) => {
    const flat = points.map((p) => ({ ...p, currentCents: cents, previousCents: cents }))
    const { container } = renderChart(flat)
    // The tick labels render in tick order: $0, $500, $2000, $5000.
    const ys = yTickYs(container)
    const y = expectedY(ys)
    for (const selector of ['.recharts-area-curve', '.recharts-line-curve']) {
      const drawn = pathPoints(container.querySelector(selector)!.getAttribute('d')!)
      expect(drawn.length).toBeGreaterThan(0)
      for (const p of drawn) expect(p.y).toBeCloseTo(y, 5)
    }
  })

  it('clamps values above the top tick to the top of the plot', () => {
    const high = points.map((p, i) => (i === 0 ? { ...p, currentCents: 900_000 } : p))
    const { container } = renderChart(high)
    const top = Math.min(...yTickYs(container))
    const first = pathPoints(container.querySelector('.recharts-area-curve')!.getAttribute('d')!)[0]!
    expect(first.y).toBeCloseTo(top, 5)
  })
})
