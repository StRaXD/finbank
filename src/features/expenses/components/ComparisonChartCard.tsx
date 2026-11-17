import { useState } from 'react'
import { useComparison } from '../../../api/hooks/useComparison.ts'
import type { ComparisonGranularity, ComparisonPoint } from '../../../api/types.ts'
import { formatMoney } from '../../../lib/format.ts'
import { AsyncSection } from '../../../ui/AsyncSection.tsx'
import { Card } from '../../../ui/Card.tsx'
import { ChartLegend } from '../../../ui/charts/ChartLegend.tsx'
import { ComparisonBarChart } from '../../../ui/charts/ComparisonBarChart.tsx'
import { Dropdown } from '../../../ui/Dropdown.tsx'

export type ComparisonChartCardProps = {
  /** The period shown first: `'year'` on Expenses (Monthly), `'week'` on Overview (Weekly). */
  defaultGranularity: ComparisonGranularity
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
 * The Expenses Comparison card (109. Expenses.png): a Monthly/Weekly dropdown and the legend on one
 * row, above the grouped bar chart. The selection is local state; the series comes from the
 * adapter as is.
 */
export function ComparisonChartCard({ defaultGranularity }: ComparisonChartCardProps) {
  const [granularity, setGranularity] = useState<ComparisonGranularity>(defaultGranularity)
  const query = useComparison(granularity)
  const period = PERIODS[granularity]
  return (
    <Card>
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
      <AsyncSection query={query} emptyMessage="No expenses to compare">
        {(points) => <ComparisonBarChart points={points} summary={summarize(points, granularity)} />}
      </AsyncSection>
    </Card>
  )
}
