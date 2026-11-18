import type { SavingsGoal } from '../../../api/types.ts'
import { formatMoney } from '../../../lib/format.ts'
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

export type SavingsGoalSummaryProps = {
  goal: SavingsGoal
  /** The period named in the gauge's screen-reader summary, e.g. "01 May ~ 31 May". */
  period: string
}

/**
 * Target Achieved and This month Target beside the `GoalGauge` (110. Goals.png, 104. Overview.png).
 * The one rendering of a savings goal's stats and gauge, shared by the Goals page's Savings Goal
 * card and Overview's Goals widget, so both show the same values the same way.
 */
export function SavingsGoalSummary({ goal, period }: SavingsGoalSummaryProps) {
  const { targetCents, achievedCents } = goal
  const summary = `Savings goal for ${period}: ${formatMoney(achievedCents, 'whole')} achieved of a ${formatMoney(targetCents, 'whole')} target.`
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex flex-col gap-6">
        <Stat icon="trophy" label="Target Achieved" cents={achievedCents} />
        <Stat icon="target" label="This month Target" cents={targetCents} />
      </div>
      {/* 110 and 104 both draw the ring's top about 4px above the stat labels. */}
      <div className="-mt-1">
        <GoalGauge achievedCents={achievedCents} targetCents={targetCents} summary={summary} />
      </div>
    </div>
  )
}
