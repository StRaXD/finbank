import type { ExpenseCategoryId } from '../api/types.ts'
import { categoryIcons } from './icons.ts'

export type CategoryIconProps = {
  category: ExpenseCategoryId
  /**
   * `'header'` (default): the Expenses card header tile, `category-tile` grey with an `ink-2` glyph
   * (109). `'plain'`: the Overview tile, a light `surface` tile with a `subtle` glyph (104).
   */
  tone?: 'header' | 'plain'
}

const toneClass = {
  header: 'bg-category-tile text-ink-2',
  plain: 'bg-surface text-subtle',
} as const

/**
 * A category's glyph on a 40×40 rounded tile: the grey `category-tile` with an `ink-2` glyph in the
 * `header` tone (109. Expenses.png), or the light `surface` tile with a `subtle` glyph in the `plain`
 * tone (104. Overview.png). Decorative: the category name is always shown next to it.
 */
export function CategoryIcon({ category, tone = 'header' }: CategoryIconProps) {
  const Glyph = categoryIcons[category]
  return (
    <span
      aria-hidden="true"
      data-testid="category-icon"
      className={`flex size-10 shrink-0 items-center justify-center rounded-card ${toneClass[tone]}`}
    >
      <Glyph data-icon={category} size={24} strokeWidth={1.5} />
    </span>
  )
}
