import { useMemo, useState } from 'react'
import { useSavingsGoal } from '../../../api/hooks/useSavingsGoal.ts'
import { useToday } from '../../../api/hooks/useToday.ts'
import type { IsoDate, YearMonth } from '../../../api/types.ts'
import { currentMonth, selectableMonths } from '../../../lib/dates.ts'
import { formatRange } from '../../../lib/format.ts'
import { AsyncSection } from '../../../ui/AsyncSection.tsx'
import { Button } from '../../../ui/Button.tsx'
import { Card } from '../../../ui/Card.tsx'
import { Dropdown } from '../../../ui/Dropdown.tsx'
import { AdjustSavingsGoalModal } from './AdjustSavingsGoalModal.tsx'
import { SavingsGoalSummary } from './SavingsGoalSummary.tsx'

export type SavingsGoalCardProps = {
  /** The selected month when the parent owns it (Goals links it to the Saving Summary). */
  month?: YearMonth
  /** Called with the picked month when the parent owns it. */
  onMonthChange?: (month: YearMonth) => void
}

function SavingsGoalContent({ today, month: controlled, onMonthChange }: SavingsGoalCardProps & { today: IsoDate }) {
  const [own, setOwn] = useState<YearMonth>(() => currentMonth(today))
  const month = controlled ?? own
  const setMonth = onMonthChange ?? setOwn
  const options = useMemo(
    () => selectableMonths(today).map((value) => ({ value, label: formatRange(value) })),
    [today],
  )
  const query = useSavingsGoal(month)
  const period = formatRange(month)
  const [adjusting, setAdjusting] = useState(false)
  const goal = query.data
  return (
    <>
      {/* 110's header sits 20px below the card's top edge, 4px above the shared 24px padding. */}
      <div className="-mt-1 flex items-center justify-between gap-4 border-b border-border pb-3">
        <h2 className="text-16 font-bold text-ink-2">Savings Goal</h2>
        <Dropdown label="Savings goal period" options={options} value={month} onChange={setMonth} variant="filled" />
      </div>
      <div className="mt-6">
        <AsyncSection query={query} emptyMessage="No savings goal for this month">
          {(goal) => <SavingsGoalSummary goal={goal} period={period} />}
        </AsyncSection>
      </div>
      <div className="mt-6 flex justify-center">
        <Button
          variant="outline"
          size="compact"
          trailingIcon="pencil"
          disabled={!goal}
          onClick={() => setAdjusting(true)}
        >
          Adjust Goal
        </Button>
      </div>
      {goal && (
        <AdjustSavingsGoalModal open={adjusting} onClose={() => setAdjusting(false)} month={month} goal={goal} />
      )}
    </>
  )
}

/**
 * The Savings Goal card (110. Goals.png): a bold "Savings Goal" header with the grey month
 * selector (the 12 months from `selectableMonths`, defaulting to the month containing today) over
 * a divider, then Target Achieved and This month Target beside the `GoalGauge`, and an outlined
 * "Adjust Goal" button that opens `AdjustSavingsGoalModal` for the selected month (disabled until
 * that month's goal has loaded). The selected month is local state unless the parent passes
 * `month` and `onMonthChange` (Goals does, so both of its cards show one month); the amounts are
 * the adapter's.
 */
export function SavingsGoalCard({ month, onMonthChange }: SavingsGoalCardProps = {}) {
  const today = useToday()
  return (
    <Card>
      <div data-testid="savings-goal-card">
        <AsyncSection query={today} emptyMessage="Today's date is unavailable">
          {(value) => <SavingsGoalContent today={value} month={month} onMonthChange={onMonthChange} />}
        </AsyncSection>
      </div>
    </Card>
  )
}
