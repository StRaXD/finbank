import { useId } from 'react'
import { Link } from 'react-router'
import type { CategorySummary } from '../../../api/types.ts'
import { formatMoney } from '../../../lib/format.ts'
import { CategoryIcon } from '../../../ui/CategoryIcon.tsx'
import { categoryLabels } from '../../../ui/categoryLabels.ts'
import { icons } from '../../../ui/icons.ts'
import { TrendIndicator } from '../../../ui/TrendIndicator.tsx'

const ArrowRight = icons.arrowRight

export type CategorySummaryTileProps = {
  summary: CategorySummary
  /** The Expenses page URL (owned by the app's route table), for the → link. */
  expensesPath: string
}

/**
 * One expense category on Overview's Expenses Breakdown (measured from 104. Overview.png): a light
 * icon tile, the name, the month total and the "%*" trend, with a → link to Expenses at the right.
 * The tile itself is not a link; only the arrow is. The arrow is grey and turns teal on hover and
 * keyboard focus (the design's teal Housing arrow is that state). The side padding (32px left, 24px
 * right, 12px gaps) is a little tighter than 104's ~36px so the seed's widest total ("$3,702.40",
 * against Figma's "$250.00") clears the arrow. Every number is the adapter's,
 * the same `CategorySummary` the Expenses card shows; nothing is summed or compared here.
 */
export function CategorySummaryTile({ summary, expensesPath }: CategorySummaryTileProps) {
  const titleId = useId()
  const { category, totalCents, changePct } = summary
  const label = categoryLabels[category]
  return (
    <article aria-labelledby={titleId} data-testid="category-tile" className="flex min-h-26.5 items-center gap-3 pr-6 pl-8">
      <CategoryIcon category={category} tone="plain" />
      <div className="flex min-w-0 flex-1 flex-col">
        <h3 id={titleId} className="text-14 font-normal text-muted">
          {label}
        </h3>
        <span className="text-18 font-bold text-ink">{formatMoney(totalCents, 'exact')}</span>
        <TrendIndicator changePct={changePct} variant="tile" />
      </div>
      <Link
        to={expensesPath}
        aria-label={`View ${label} expenses`}
        className="shrink-0 rounded-button text-subtle transition-colors hover:text-primary focus-visible:text-primary"
      >
        <ArrowRight aria-hidden="true" data-icon="arrowRight" size={24} strokeWidth={1.5} />
      </Link>
    </article>
  )
}
