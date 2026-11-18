import { useId, useState } from 'react'
import { useToday } from '../../api/hooks/useToday.ts'
import type { IsoDate, YearMonth } from '../../api/types.ts'
import { currentMonth } from '../../lib/dates.ts'
import { AsyncSection } from '../../ui/AsyncSection.tsx'
import { CategoryLimitsGrid } from './components/CategoryLimitsGrid.tsx'
import { SavingSummaryCard } from './components/SavingSummaryCard.tsx'
import { SavingsGoalCard } from './components/SavingsGoalCard.tsx'

/** The top row: one selected month (default: the month containing today) shared by both cards. */
function GoalsTopRow({ today }: { today: IsoDate }) {
  const [month, setMonth] = useState<YearMonth>(() => currentMonth(today))
  return (
    <div className="grid grid-cols-[368fr_712fr] gap-6">
      <SavingsGoalCard month={month} onMonthChange={setMonth} />
      <SavingSummaryCard today={today} month={month} onMonthChange={setMonth} />
    </div>
  )
}

/**
 * Goals (110. Goals.png): the visible "Goals" title above a row of the Savings Goal card and, in
 * the wider second column, the Saving Summary chart. Both cards' month dropdowns read and set the
 * one month owned here, so they always show the same month. Below, 32px down, "Expenses Goals by
 * Category" titles the grid of category spending limits, 16px above it.
 */
export function GoalsPage() {
  const today = useToday()
  const limitsId = useId()
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-22 font-normal text-subtle">Goals</h1>
      <AsyncSection query={today} emptyMessage="Today's date is unavailable">
        {(value) => <GoalsTopRow today={value} />}
      </AsyncSection>
      <section aria-labelledby={limitsId} className="mt-4 flex flex-col gap-4">
        <h2 id={limitsId} className="text-22 font-normal text-subtle">
          Expenses Goals by Category
        </h2>
        <CategoryLimitsGrid />
      </section>
    </div>
  )
}
