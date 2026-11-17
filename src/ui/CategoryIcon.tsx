import type { ExpenseCategoryId } from '../api/types.ts'
import { categoryIcons } from './icons.ts'

export type CategoryIconProps = {
  category: ExpenseCategoryId
}

/**
 * A category's glyph on a 40×40 rounded grey tile (109. Expenses.png). Decorative: the category
 * name is always shown next to it.
 */
export function CategoryIcon({ category }: CategoryIconProps) {
  const Glyph = categoryIcons[category]
  return (
    <span
      aria-hidden="true"
      data-testid="category-icon"
      className="flex size-10 shrink-0 items-center justify-center rounded-card bg-category-tile text-ink-2"
    >
      <Glyph data-icon={category} size={24} strokeWidth={1.5} />
    </span>
  )
}
