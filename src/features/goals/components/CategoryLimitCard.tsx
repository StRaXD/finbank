import { useId, useState } from 'react'
import type { CategoryLimit } from '../../../api/types.ts'
import { formatMoney } from '../../../lib/format.ts'
import { Button } from '../../../ui/Button.tsx'
import { CategoryIcon } from '../../../ui/CategoryIcon.tsx'
import { categoryLabels } from '../../../ui/categoryLabels.ts'
import { AdjustCategoryLimitModal } from './AdjustCategoryLimitModal.tsx'

export type CategoryLimitCardProps = {
  limit: CategoryLimit
}

/**
 * One category's monthly spending limit (measured from 110. Goals.png): a 103px white card with
 * the 40×48 icon tile, the name over the limit in the exact style, and an outlined "Adjust" that
 * opens `AdjustCategoryLimitModal` for this category. There is no over-limit indicator: the limit
 * is never compared with spending. The card owns its modal's open state.
 */
export function CategoryLimitCard({ limit }: CategoryLimitCardProps) {
  const titleId = useId()
  const [adjusting, setAdjusting] = useState(false)
  const label = categoryLabels[limit.category]
  return (
    <article
      aria-labelledby={titleId}
      data-testid="category-limit-card"
      className="flex h-25.75 items-center gap-4 rounded-card bg-card px-6 shadow-card"
    >
      <CategoryIcon category={limit.category} tone="limit" />
      <div className="flex min-w-0 flex-1 flex-col">
        <h3 id={titleId} className="truncate text-16 font-normal text-subtle">
          {label}
        </h3>
        <span className="mt-0.5 text-20 font-bold text-ink">{formatMoney(limit.limitCents, 'exact')}</span>
      </div>
      {/* 110 draws this "Adjust" 99px wide (about 16px each side), narrower than the compact
          button's own 20px padding gives, so it fills a fixed-width slot with its content centred. */}
      <div className="w-24.75 shrink-0">
        <Button
          variant="outline"
          size="compact"
          fullWidth
          trailingIcon="pencil"
          aria-label={`Adjust ${label} limit`}
          onClick={() => setAdjusting(true)}
        >
          Adjust
        </Button>
      </div>
      <AdjustCategoryLimitModal open={adjusting} onClose={() => setAdjusting(false)} limit={limit} />
    </article>
  )
}
