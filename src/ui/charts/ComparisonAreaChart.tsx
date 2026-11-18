import { useId, useMemo } from 'react'
import { Area, AreaChart, CartesianGrid, Line, ResponsiveContainer, XAxis, YAxis } from 'recharts'
import type { SavingSummaryPoint } from '../../api/types.ts'
import { createTickScale } from '../../lib/chartScale.ts'
import { formatDate, formatMoney } from '../../lib/format.ts'
import { readChartColors } from './chartColors.ts'

export type ComparisonAreaChartProps = {
  /** One point per day of the month, day 1 first, as the adapter derived them. */
  points: readonly SavingSummaryPoint[]
  /** The text alternative: a summary of both series, rendered for screen readers only. */
  summary: string
  /** The value ticks in cents (Saving Summary: `SAVING_TICKS`). */
  ticksCents: readonly number[]
  /** Initial size before the container is measured (tests, first paint). */
  initialWidth?: number
}

/**
 * Measured from 110. Goals.png at 1x: the plot is 150px tall (the $5000 tick 26px below the
 * chart's top) and the y labels end 25px left of it. The x padding puts day 1 and day 30 under
 * 110's "May 01" and "May 30" labels (110's decorative curve also runs into that padding).
 */
const CHART_HEIGHT = 203
const MARGIN = { top: 26, right: 0, bottom: 0, left: 0 }
const Y_AXIS_WIDTH = 72
const X_AXIS_HEIGHT = CHART_HEIGHT - MARGIN.top - 150
const X_PADDING = { left: 34, right: 37 }
const STROKE_WIDTH = 2
const DASH = '5 2'
const TICK_CLASS = 'fill-subtle text-14'

/** Day 1 and every 5th day (5, 10 … 30): the x ticks. The points start on day 1. */
function isTickDay(index: number): boolean {
  return index === 0 || (index + 1) % 5 === 0
}

/**
 * A daily area chart of this month against the same period last month on the given tick scale
 * (AD-16): the current series a smooth teal line over a teal gradient, the previous series a grey
 * dashed line, vertical gridlines at the x ticks. A `null` value is a gap, never drawn as 0. The
 * SVG is hidden from assistive technology; `summary` is the text alternative.
 */
export function ComparisonAreaChart({ points, summary, ticksCents, initialWidth = 664 }: ComparisonAreaChartProps) {
  const colors = useMemo(() => readChartColors(), [])
  const scale = useMemo(() => createTickScale(ticksCents), [ticksCents])
  const gradientId = `saving-fill-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
  const data = useMemo(
    () =>
      points.map((point) => ({
        date: point.date,
        current: point.currentCents === null ? null : scale.toPlot(point.currentCents),
        previous: point.previousCents === null ? null : scale.toPlot(point.previousCents),
      })),
    [points, scale],
  )
  const xTicks = useMemo(() => points.filter((_, i) => isTickDay(i)).map((point) => point.date), [points])
  const yTicks = scale.ticks.map((tick) => tick.plot)
  const last = yTicks.length - 1

  return (
    <div>
      <p className="sr-only">{summary}</p>
      <div aria-hidden="true" data-testid="comparison-area-chart">
        <ResponsiveContainer width="100%" height={CHART_HEIGHT} initialDimension={{ width: initialWidth, height: CHART_HEIGHT }}>
          <AreaChart data={data} margin={MARGIN} accessibilityLayer={false}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={colors.current} stopOpacity={0.2} />
                <stop offset="100%" stopColor={colors.current} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid horizontal={false} syncWithTicks stroke={colors.grid} />
            <XAxis
              dataKey="date"
              ticks={xTicks}
              interval={0}
              axisLine={false}
              tickLine={false}
              tickSize={0}
              tickMargin={12}
              height={X_AXIS_HEIGHT}
              padding={X_PADDING}
              tick={{ className: TICK_CLASS }}
              tickFormatter={(date: SavingSummaryPoint['date']) => formatDate(date, 'axisDay')}
            />
            <YAxis
              type="number"
              domain={[0, last]}
              ticks={yTicks}
              interval={0}
              allowDataOverflow
              axisLine={false}
              tickLine={false}
              tickSize={0}
              tickMargin={25}
              width={Y_AXIS_WIDTH}
              tick={{ className: TICK_CLASS }}
              tickFormatter={(plot: number) => formatMoney(scale.ticks[plot]?.cents ?? 0, 'ungrouped')}
            />
            <Area
              dataKey="current"
              type="monotone"
              stroke={colors.current}
              strokeWidth={STROKE_WIDTH}
              fill={`url(#${gradientId})`}
              fillOpacity={1}
              dot={false}
              activeDot={false}
              isAnimationActive={false}
            />
            <Line
              dataKey="previous"
              type="monotone"
              stroke={colors.previous}
              strokeWidth={STROKE_WIDTH}
              strokeDasharray={DASH}
              dot={false}
              activeDot={false}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
