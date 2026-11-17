import { useMemo } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis } from 'recharts'
import type { ComparisonPoint } from '../../api/types.ts'
import { BAR_TICKS, createTickScale } from '../../lib/chartScale.ts'
import { formatCompact } from '../../lib/format.ts'
import { readChartColors } from './chartColors.ts'

export type ComparisonBarChartProps = {
  points: readonly ComparisonPoint[]
  /** The text alternative: a summary of both series, rendered for screen readers only. */
  summary: string
  /** The value ticks in cents (default `BAR_TICKS`). */
  ticksCents?: readonly number[]
  /** Initial size before the container is measured (tests, first paint). */
  initialWidth?: number
}

/** Measured from 109. Expenses.png at 1x: 16px bars, an 8px gap in a pair, 36px between gridlines. */
const BAR_SIZE = 16
const BAR_GAP = 8
const BAR_RADIUS: [number, number, number, number] = [4, 4, 0, 0]
const CHART_HEIGHT = 186
const Y_AXIS_WIDTH = 64
const X_AXIS_HEIGHT = 26
const MARGIN = { top: 16, right: 0, bottom: 0, left: 0 }
// 109 ends the last bar pair about 25px short of the gridlines' right end: at the 1440 layout the
// 12 monthly bands are 80px wide, as in the design.
const X_PADDING = { left: 0, right: 32 }
const TICK_CLASS = 'fill-subtle text-14'

/**
 * A grouped bar chart of a current and a previous period on the tick scale (AD-16): previous bars
 * light grey, current bars teal, horizontal gridlines only. A `null` current value draws no bar.
 * The SVG is hidden from assistive technology; `summary` is the text alternative.
 */
export function ComparisonBarChart({ points, summary, ticksCents = BAR_TICKS, initialWidth = 1000 }: ComparisonBarChartProps) {
  const colors = useMemo(() => readChartColors(), [])
  const scale = useMemo(() => createTickScale(ticksCents), [ticksCents])
  const data = useMemo(
    () =>
      points.map((point) => ({
        label: point.label,
        previous: scale.toPlot(point.previousCents),
        current: point.currentCents === null ? null : scale.toPlot(point.currentCents),
      })),
    [points, scale],
  )
  const ticks = scale.ticks.map((tick) => tick.plot)
  const last = ticks.length - 1

  return (
    <div>
      <p className="sr-only">{summary}</p>
      <div aria-hidden="true" data-testid="comparison-chart">
        <ResponsiveContainer width="100%" height={CHART_HEIGHT} initialDimension={{ width: initialWidth, height: CHART_HEIGHT }}>
          <BarChart data={data} margin={MARGIN} barGap={BAR_GAP} accessibilityLayer={false}>
            <CartesianGrid vertical={false} stroke={colors.grid} />
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              height={X_AXIS_HEIGHT}
              tickMargin={8}
              interval={0}
              padding={X_PADDING}
              tick={{ className: TICK_CLASS }}
            />
            <YAxis
              type="number"
              domain={[0, last]}
              ticks={ticks}
              interval={0}
              allowDataOverflow
              axisLine={false}
              tickLine={false}
              width={Y_AXIS_WIDTH}
              tickMargin={16}
              tick={{ className: TICK_CLASS }}
              tickFormatter={(plot: number) => formatCompact(scale.ticks[plot]?.cents ?? 0, 'axis')}
            />
            <Bar dataKey="previous" fill={colors.previous} barSize={BAR_SIZE} radius={BAR_RADIUS} isAnimationActive={false} />
            <Bar dataKey="current" fill={colors.current} barSize={BAR_SIZE} radius={BAR_RADIUS} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
