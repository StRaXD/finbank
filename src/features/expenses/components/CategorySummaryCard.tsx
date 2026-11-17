import { useId } from 'react'
import type { CategorySummary } from '../../../api/types.ts'
import { formatDate, formatMoney } from '../../../lib/format.ts'
import { CategoryIcon } from '../../../ui/CategoryIcon.tsx'
import { categoryLabels } from '../../../ui/categoryLabels.ts'
import { EmptyState } from '../../../ui/EmptyState.tsx'
import { TrendIndicator } from '../../../ui/TrendIndicator.tsx'

export type CategorySummaryCardProps = {
  summary: CategorySummary
}

/**
 * One expense category on Expenses (measured from 109. Expenses.png): a 78px grey header band
 * with the icon, name, month total and trend against last month, over the month's two most recent
 * items. Not interactive. Every number is the adapter's; nothing is summed or compared here.
 */
export function CategorySummaryCard({ summary }: CategorySummaryCardProps) {
  const titleId = useId()
  const { category, totalCents, changePct, recentItems } = summary
  return (
    <article
      aria-labelledby={titleId}
      data-testid="category-card"
      className="flex flex-col overflow-hidden rounded-card bg-card shadow-card"
    >
      <div className="flex min-h-19.5 items-center gap-4 bg-category-header px-6 py-2">
        <CategoryIcon category={category} />
        <div className="flex min-w-0 flex-1 flex-col">
          <h3 id={titleId} className="text-16 font-normal text-ink-2">
            {categoryLabels[category]}
          </h3>
          <span className="text-20 font-bold text-ink">{formatMoney(totalCents, 'exact')}</span>
        </div>
        <TrendIndicator changePct={changePct} caption="Compare to last month" />
      </div>
      {recentItems.length === 0 ? (
        <div className="flex min-h-18.75 items-center px-6">
          <EmptyState message="No expenses this month" />
        </div>
      ) : (
        <ul className="flex flex-col divide-y divide-surface px-6 pb-2">
          {recentItems.map((item) => (
            <li key={item.id} className="flex min-h-18.75 items-center justify-between gap-4 py-3">
              <span title={item.item} className="min-w-0 truncate text-16 font-bold text-ink-2">{item.item}</span>
              <span className="flex shrink-0 flex-col items-end">
                <span className="text-16 font-bold text-ink-2">{formatMoney(item.amountCents, 'exact')}</span>
                <span className="text-12 text-subtle">{formatDate(item.date, 'row')}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </article>
  )
}
