import { useId } from 'react'
import { useCategorySummaries } from '../../api/hooks/useCategorySummaries.ts'
import { AsyncSection } from '../../ui/AsyncSection.tsx'
import { CategorySummaryCard } from './components/CategorySummaryCard.tsx'

/**
 * Expenses (109. Expenses.png). Story 3.1 renders Expenses Breakdown: six category cards in a
 * 3×2 grid. The page has no visible title, so its `h1` is visually hidden.
 */
export function ExpensesPage() {
  const breakdownId = useId()
  const query = useCategorySummaries()
  return (
    <>
      <h1 className="sr-only">Expenses</h1>
      <section aria-labelledby={breakdownId} className="flex flex-col gap-2">
        <h2 id={breakdownId} className="text-22 font-normal text-subtle">
          Expenses Breakdown
        </h2>
        <AsyncSection query={query} emptyMessage="No expenses this month">
          {(summaries) => (
            <div data-testid="category-grid" className="grid grid-cols-3 gap-6">
              {summaries.map((summary) => (
                <CategorySummaryCard key={summary.category} summary={summary} />
              ))}
            </div>
          )}
        </AsyncSection>
      </section>
    </>
  )
}
