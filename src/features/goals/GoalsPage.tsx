import { useState } from 'react'
import { useToday } from '../../api/hooks/useToday.ts'
import type { IsoDate, YearMonth } from '../../api/types.ts'
import { currentMonth } from '../../lib/dates.ts'
import { AsyncSection } from '../../ui/AsyncSection.tsx'
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
 * one month owned here, so they always show the same month.
 */
export function GoalsPage() {
  const today = useToday()
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-22 font-normal text-subtle">Goals</h1>
      <AsyncSection query={today} emptyMessage="Today's date is unavailable">
        {(value) => <GoalsTopRow today={value} />}
      </AsyncSection>
    </div>
  )
}
