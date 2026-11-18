import { useCategoryLimits } from '../../../api/hooks/useCategoryLimits.ts'
import { AsyncSection } from '../../../ui/AsyncSection.tsx'
import { CategoryLimitCard } from './CategoryLimitCard.tsx'

/**
 * "Expenses Goals by Category" (110. Goals.png): the six category limit cards in a 3×2 grid, in
 * the adapter's fixed category order, 24px apart across and 16px down. Loading, error and empty
 * states go through `AsyncSection`.
 */
export function CategoryLimitsGrid() {
  const query = useCategoryLimits()
  return (
    <AsyncSection query={query} isEmpty={(limits) => limits.length === 0} emptyMessage="No category limits yet">
      {(limits) => (
        <div data-testid="category-limit-grid" className="grid grid-cols-3 gap-x-6 gap-y-4">
          {limits.map((limit) => (
            <CategoryLimitCard key={limit.category} limit={limit} />
          ))}
        </div>
      )}
    </AsyncSection>
  )
}
