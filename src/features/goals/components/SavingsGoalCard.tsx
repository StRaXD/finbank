import { useMemo, useState } from 'react'
import { useSavingsGoal } from '../../../api/hooks/useSavingsGoal.ts'
import { useToday } from '../../../api/hooks/useToday.ts'
import type { IsoDate, SavingsGoal, YearMonth } from '../../../api/types.ts'
import { currentMonth, selectableMonths } from '../../../lib/dates.ts'
import { formatMoney, formatRange } from '../../../lib/format.ts'
import { AsyncSection } from '../../../ui/AsyncSection.tsx'
import { Button } from '../../../ui/Button.tsx'
import { Card } from '../../../ui/Card.tsx'
import { Dropdown } from '../../../ui/Dropdown.tsx'
import { GoalGauge } from '../../../ui/GoalGauge.tsx'
import { icons, type IconName } from '../../../ui/icons.ts'

function Stat({ icon, label, cents }: { icon: IconName; label: string; cents: number }) {
  const Icon = icons[icon]
  return (
    <div className="flex items-start gap-2">
      <Icon aria-hidden="true" data-icon={icon} size={20} className="mt-0.5 shrink-0 text-ink-2" />
      <dl className="flex flex-col">
        <dt className="text-12 text-subtle">{label}</dt>
        <dd className="mt-1 text-16 font-bold text-ink">{formatMoney(cents, 'whole')}</dd>
      </dl>
    </div>
  )
}

function GoalBody({ goal, period }: { goal: SavingsGoal; period: string }) {
  const { targetCents, achievedCents } = goal
  const summary = `Savings goal for ${period}: ${formatMoney(achievedCents, 'whole')} achieved of a ${formatMoney(targetCents, 'whole')} target.`
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex flex-col gap-6">
        <Stat icon="trophy" label="Target Achieved" cents={achievedCents} />
        <Stat icon="target" label="This month Target" cents={targetCents} />
      </div>
      {/* 110 draws the ring's top 4px above the stat labels. */}
      <div className="-mt-1">
        <GoalGauge achievedCents={achievedCents} targetCents={targetCents} summary={summary} />
      </div>
    </div>
  )
}

function SavingsGoalContent({ today }: { today: IsoDate }) {
  const [month, setMonth] = useState<YearMonth>(() => currentMonth(today))
  const options = useMemo(
    () => selectableMonths(today).map((value) => ({ value, label: formatRange(value) })),
    [today],
  )
  const query = useSavingsGoal(month)
  const period = formatRange(month)
  return (
    <>
      {/* 110's header sits 20px below the card's top edge, 4px above the shared 24px padding. */}
      <div className="-mt-1 flex items-center justify-between gap-4 border-b border-border pb-3">
        <h2 className="text-16 font-bold text-ink-2">Savings Goal</h2>
        <Dropdown label="Savings goal period" options={options} value={month} onChange={setMonth} variant="filled" />
      </div>
      <div className="mt-6">
        <AsyncSection query={query} emptyMessage="No savings goal for this month">
          {(goal) => <GoalBody goal={goal} period={period} />}
        </AsyncSection>
      </div>
      <div className="mt-6 flex justify-center">
        {/* Story 4.2 opens the Adjust Savings Goal modal from here. */}
        <Button variant="outline" size="compact" trailingIcon="pencil">
          Adjust Goal
        </Button>
      </div>
    </>
  )
}

/**
 * The Savings Goal card (110. Goals.png): a bold "Savings Goal" header with the grey month
 * selector (the 12 months from `selectableMonths`, defaulting to the month containing today) over
 * a divider, then Target Achieved and This month Target beside the `GoalGauge`, and an outlined
 * "Adjust Goal" button. The selected month is local state; the amounts are the adapter's.
 */
export function SavingsGoalCard() {
  const today = useToday()
  return (
    <Card>
      <div data-testid="savings-goal-card">
        <AsyncSection query={today} emptyMessage="Today's date is unavailable">
          {(value) => <SavingsGoalContent today={value} />}
        </AsyncSection>
      </div>
    </Card>
  )
}
