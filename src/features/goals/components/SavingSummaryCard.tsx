import { useMemo } from 'react'
import { useSavingSummary } from '../../../api/hooks/useSavingSummary.ts'
import type { IsoDate, SavingSummaryPoint, YearMonth } from '../../../api/types.ts'
import { SAVING_TICKS } from '../../../lib/chartScale.ts'
import { monthRange, selectableMonths } from '../../../lib/dates.ts'
import { formatDate, formatMoney } from '../../../lib/format.ts'
import { AsyncSection } from '../../../ui/AsyncSection.tsx'
import { Card } from '../../../ui/Card.tsx'
import { ChartLegend } from '../../../ui/charts/ChartLegend.tsx'
import { ComparisonAreaChart } from '../../../ui/charts/ComparisonAreaChart.tsx'
import { Dropdown } from '../../../ui/Dropdown.tsx'

const LEGEND = [
  { label: 'This month', tone: 'current' },
  { label: 'Same period last month', tone: 'previous' },
] as const

/** "May 2023" for a month. */
function monthLabel(month: YearMonth): string {
  return formatDate(monthRange(month).start, 'monthYear')
}

/** One series in words: its total and its highest day, in whole dollars (the true amounts, never clamped). */
function describeSeries(points: readonly SavingSummaryPoint[], key: 'currentCents' | 'previousCents'): string {
  let total = 0
  let best: { cents: number; date: IsoDate } | null = null
  for (const point of points) {
    const cents = point[key]
    if (cents === null) continue
    total += cents
    if (!best || cents > best.cents) best = { cents, date: point.date }
  }
  if (!best) return 'no data'
  if (total === 0) return 'no savings'
  return `${formatMoney(total, 'whole')} in total, highest ${formatMoney(best.cents, 'whole')} on day ${formatDate(best.date, 'day')}`
}

/** The chart's text alternative. */
function savingSummaryText(month: YearMonth, points: readonly SavingSummaryPoint[]): string {
  return `Saving summary for ${monthLabel(month)}, daily savings. This month: ${describeSeries(points, 'currentCents')}. Same period last month: ${describeSeries(points, 'previousCents')}.`
}

export type SavingSummaryCardProps = {
  today: IsoDate
  /** The selected month, shared with the Savings Goal card. */
  month: YearMonth
  onMonthChange: (month: YearMonth) => void
}

/**
 * The Saving Summary card (110. Goals.png): a bold "Saving Summary" title, the month dropdown
 * ("May 2023", the 12 months from `selectableMonths`), the legend, and the daily
 * `ComparisonAreaChart` of the month against the previous one, as the adapter derived it.
 */
export function SavingSummaryCard({ today, month, onMonthChange }: SavingSummaryCardProps) {
  const options = useMemo(
    () => selectableMonths(today).map((value) => ({ value, label: monthLabel(value) })),
    [today],
  )
  const query = useSavingSummary(month)
  return (
    <Card fill>
      <div data-testid="saving-summary-card">
        {/* Same header line as the Savings Goal card: 20px below the card's top edge, 32px high. */}
        <div className="-mt-1 flex h-8 items-center gap-8">
          <h2 className="text-16 font-bold text-ink-2">Saving Summary</h2>
          <Dropdown label="Saving summary month" options={options} value={month} onChange={onMonthChange} variant="subtle" />
          {/* 110's legend text ends 2px short of the card's padding edge. */}
          <div className="mr-0.5 ml-auto">
            <ChartLegend items={LEGEND} spacing="wide" />
          </div>
        </div>
        <div className="mt-3">
          <AsyncSection query={query} isEmpty={(points) => points.length === 0} emptyMessage="No savings for this month">
            {(points) => (
              <ComparisonAreaChart points={points} summary={savingSummaryText(month, points)} ticksCents={SAVING_TICKS} />
            )}
          </AsyncSection>
        </div>
      </div>
    </Card>
  )
}
