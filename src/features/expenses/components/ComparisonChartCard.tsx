import { useMemo, useState } from 'react'
import { useComparison } from '../../../api/hooks/useComparison.ts'
import type { ComparisonGranularity, ComparisonPoint } from '../../../api/types.ts'
import { fitLadderTicks } from '../../../lib/chartScale.ts'
import { formatMoney } from '../../../lib/format.ts'
import { AsyncSection } from '../../../ui/AsyncSection.tsx'
import { Card } from '../../../ui/Card.tsx'
import { ChartLegend } from '../../../ui/charts/ChartLegend.tsx'
import { ComparisonBarChart } from '../../../ui/charts/ComparisonBarChart.tsx'
import { Dropdown } from '../../../ui/Dropdown.tsx'

export type ComparisonChartCardProps = {
  /** The period shown first: `'year'` on Expenses (Monthly), `'week'` on Overview (Weekly). */
  defaultGranularity: ComparisonGranularity
  /** The section title above the card, in `Card`'s title style ("Statistics" on Overview). */
  title?: string
}

const OPTIONS = [
  { value: 'year', label: 'Monthly Comparison' },
  { value: 'week', label: 'Weekly Comparison' },
] as const satisfies readonly { value: ComparisonGranularity; label: string }[]

const PERIODS: Record<ComparisonGranularity, { current: string; previous: string; title: string }> = {
  year: { current: 'This Year', previous: 'Last Year', title: 'Monthly expenses' },
  week: { current: 'This week', previous: 'Last week', title: 'Daily expenses' },
}

/** The chart's text alternative: every point as given, in whole dollars, or "no data yet". */
function summarize(points: readonly ComparisonPoint[], granularity: ComparisonGranularity): string {
  const period = PERIODS[granularity]
  const current = period.current.toLowerCase()
  const previous = period.previous.toLowerCase()
  const parts = points.map((point) => {
    const now = point.currentCents === null ? 'no data yet' : formatMoney(point.currentCents, 'whole')
    return `${point.label}: ${current} ${now}, ${previous} ${formatMoney(point.previousCents, 'whole')}.`
  })
  return `${period.title}, ${current} compared with ${previous}. ${parts.join(' ')}`
}

/**
 * The axis ladder fitted to the points as shown: the largest value of both series, nulls ignored.
 * Presentation only; the series values are drawn as given.
 */
function fittedTicks(points: readonly ComparisonPoint[]): readonly number[] {
  let max = 0
  for (const point of points) max = Math.max(max, point.previousCents, point.currentCents ?? 0)
  return fitLadderTicks(max)
}

function FittedComparisonChart({ points, granularity }: { points: readonly ComparisonPoint[]; granularity: ComparisonGranularity }) {
  const ticksCents = useMemo(() => fittedTicks(points), [points])
  return <ComparisonBarChart points={points} ticksCents={ticksCents} summary={summarize(points, granularity)} />
}

/**
 * The Expenses Comparison card (109. Expenses.png): a Monthly/Weekly dropdown and the legend on one
 * row, above the grouped bar chart. The selection is local state; the series comes from the
 * adapter as is, on the ladder fitted to the shown series. Overview reuses it as Statistics.
 */
export function ComparisonChartCard({ defaultGranularity, title }: ComparisonChartCardProps) {
  const [granularity, setGranularity] = useState<ComparisonGranularity>(defaultGranularity)
  const query = useComparison(granularity)
  const period = PERIODS[granularity]
  return (
    <Card title={title}>
      <div className="flex h-6 items-center justify-between gap-4">
        <Dropdown
          label="Comparison period"
          options={OPTIONS}
          value={granularity}
          onChange={setGranularity}
          variant="plain"
        />
        <ChartLegend
          items={[
            { label: period.current, tone: 'current' },
            { label: period.previous, tone: 'previous' },
          ]}
        />
      </div>
      <AsyncSection query={query} isEmpty={(points) => points.length === 0} emptyMessage="No expenses to compare">
        {(points) => <FittedComparisonChart points={points} granularity={granularity} />}
      </AsyncSection>
    </Card>
  )
}
