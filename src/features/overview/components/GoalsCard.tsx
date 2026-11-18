import { useState } from 'react'
import { useSavingsGoal } from '../../../api/hooks/useSavingsGoal.ts'
import { useToday } from '../../../api/hooks/useToday.ts'
import type { IsoDate } from '../../../api/types.ts'
import { currentMonth, monthRange } from '../../../lib/dates.ts'
import { formatDate, formatMoney, formatRange } from '../../../lib/format.ts'
import { AsyncSection } from '../../../ui/AsyncSection.tsx'
import { Card } from '../../../ui/Card.tsx'
import { icons } from '../../../ui/icons.ts'
import { AdjustSavingsGoalModal, SavingsGoalSummary } from '../../goals/index.ts'

const emptyMessage = 'No savings goal for this month'
const PencilIcon = icons.pencil

function GoalsContent({ today }: { today: IsoDate }) {
  const month = currentMonth(today)
  const query = useSavingsGoal(month)
  const [adjusting, setAdjusting] = useState(false)
  const goal = query.data
  const monthLabel = formatDate(monthRange(month).start, 'monthComma')
  return (
    <>
      {/* 104 sets the pencil square 20px below the card's top edge, 4px above the shared padding. */}
      <div className="-mt-1 flex items-center gap-4 border-b border-border pb-3">
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          {goal ? (
            <p data-testid="goals-target" className="text-22 font-extrabold text-ink">
              <span className="sr-only">Target for {monthLabel}: </span>
              {formatMoney(goal.targetCents, 'whole')}
            </p>
          ) : (
            // Holds the amount's place (one 32px text-22 line, about "$20,000" wide) so the pencil
            // does not jump right when the goal loads; it pulses only while loading.
            <span
              aria-hidden="true"
              data-testid="goals-target-placeholder"
              className={`h-8 w-24 shrink-0 rounded-button ${query.isPending ? 'animate-pulse bg-border' : ''}`}
            />
          )}
          <button
            type="button"
            aria-label="Adjust savings goal"
            disabled={!goal}
            onClick={() => setAdjusting(true)}
            className="inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-button bg-surface text-ink-2 transition enabled:hover:brightness-95 disabled:cursor-not-allowed disabled:text-muted"
          >
            <PencilIcon aria-hidden="true" data-icon="pencil" size={16} />
          </button>
        </div>
        <span className="shrink-0 text-14 font-medium text-ink-2">{monthLabel}</span>
      </div>
      <div className="mt-6">
        <AsyncSection query={query} emptyMessage={emptyMessage}>
          {(data) => <SavingsGoalSummary goal={data} period={formatRange(month)} />}
        </AsyncSection>
      </div>
      {goal && (
        <AdjustSavingsGoalModal open={adjusting} onClose={() => setAdjusting(false)} month={month} goal={goal} />
      )}
    </>
  )
}

/**
 * Goals (104. Overview.png): this month's savings target with a grey pencil square that opens the
 * shared `AdjustSavingsGoalModal`, the month ("May, 2023") on the right, then the shared
 * `SavingsGoalSummary`. It reads the same `useSavingsGoal(currentMonth(today))` query as the Goals
 * page, so a save on either page updates both. Always the current month: there is no selector.
 */
export function GoalsCard() {
  const today = useToday()
  return (
    <Card title="Goals" fill>
      <div data-testid="goals-card">
        <AsyncSection query={today} emptyMessage="Today's date is unavailable">
          {(value) => <GoalsContent today={value} />}
        </AsyncSection>
      </div>
    </Card>
  )
}
