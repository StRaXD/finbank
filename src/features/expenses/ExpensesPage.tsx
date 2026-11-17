import { useId } from 'react'
import { useCategorySummaries } from '../../api/hooks/useCategorySummaries.ts'
import { AsyncSection } from '../../ui/AsyncSection.tsx'
import { CategorySummaryCard } from './components/CategorySummaryCard.tsx'
import { ComparisonChartCard } from './components/ComparisonChartCard.tsx'

/**
 * Expenses (109. Expenses.png): the Expenses Comparison chart (Monthly by default) above the
 * Expenses Breakdown's six category cards in a 3×2 grid, 32px apart. Section titles sit 16px above
 * their content. The page has no visible title, so its `h1` is visually hidden.
 */
export function ExpensesPage() {
  const comparisonId = useId()
  const breakdownId = useId()
  const query = useCategorySummaries()
  return (
    <div className="flex flex-col gap-8">
      <h1 className="sr-only">Expenses</h1>
      <section aria-labelledby={comparisonId} className="flex flex-col gap-4">
        <h2 id={comparisonId} className="text-22 font-normal text-subtle">
          Expenses Comparison
        </h2>
        <ComparisonChartCard defaultGranularity="year" />
      </section>
      <section aria-labelledby={breakdownId} className="flex flex-col gap-4">
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
    </div>
  )
}
