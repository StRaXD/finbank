import { useCategorySummaries } from '../../../api/hooks/useCategorySummaries.ts'
import { AsyncSection } from '../../../ui/AsyncSection.tsx'
import { Card } from '../../../ui/Card.tsx'
import { CategorySummaryTile } from '../../expenses/index.ts'

export type ExpensesBreakdownCardProps = {
  /** The Expenses page URL (owned by the app's route table), for each tile's → link. */
  expensesPath: string
}

/**
 * Expenses Breakdown (measured from 104. Overview.png at 1x): six category tiles in a 3×2 grid that
 * spans the whole 728px card box, so the columns split it into thirds. 1px dividers sit between
 * the columns (inset 20px from the top and bottom) and between the rows (inset 24px from the
 * sides). The "%*" on each tile refers to the "*Compare to last month" caption on the title row.
 * Reads the same `useCategorySummaries()` query as the Expenses page, so the numbers match.
 */
export function ExpensesBreakdownCard({ expensesPath }: ExpensesBreakdownCardProps) {
  const query = useCategorySummaries()
  return (
    <Card title="Expenses Breakdown" actions={<span className="text-14 text-subtle">*Compare to last month</span>}>
      <AsyncSection query={query} emptyMessage="No expenses this month">
        {(summaries) => (
          // -m-6 cancels the card padding: the tiles and dividers are measured from the card edge.
          <div data-testid="category-tile-grid" className="relative -m-6 grid grid-cols-3 grid-rows-2">
            {summaries.map((summary) => (
              <CategorySummaryTile key={summary.category} summary={summary} expensesPath={expensesPath} />
            ))}
            <span aria-hidden="true" className="pointer-events-none absolute top-1/2 right-6 left-6 h-px bg-surface" />
            <span aria-hidden="true" className="pointer-events-none absolute top-5 bottom-5 left-1/3 w-px bg-surface" />
            <span aria-hidden="true" className="pointer-events-none absolute top-5 bottom-5 left-2/3 w-px bg-surface" />
          </div>
        )}
      </AsyncSection>
    </Card>
  )
}
