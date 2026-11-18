import type { ExpenseCategoryId } from '../api/types.ts'
import { categoryIcons } from './icons.ts'

export type CategoryIconProps = {
  category: ExpenseCategoryId
  /**
   * `'header'` (default): the Expenses card header tile, `category-tile` grey with an `ink-2` glyph
   * (109). `'plain'`: the Overview tile, a light `surface` tile with a `subtle` glyph (104).
   * `'limit'`: the Goals limit-card tile, a 40×48 `surface` tile with an `ink-2` glyph (110).
   */
  tone?: 'header' | 'plain' | 'limit'
}

const toneClass = {
  header: 'size-10 bg-category-tile text-ink-2',
  plain: 'size-10 bg-surface text-subtle',
  limit: 'h-12 w-10 bg-surface text-ink-2',
} as const

/**
 * A category's glyph on a rounded tile: 40×40 with the grey `category-tile` and an `ink-2` glyph in
 * the `header` tone (109. Expenses.png), 40×40 with the light `surface` tile and a `subtle` glyph in
 * the `plain` tone (104. Overview.png), or 40×48 with the `surface` tile and an `ink-2` glyph in the
 * `limit` tone of Goals' limit cards (110. Goals.png).
 * Decorative: the category name is always shown next to it.
 */
export function CategoryIcon({ category, tone = 'header' }: CategoryIconProps) {
  const Glyph = categoryIcons[category]
  return (
    <span
      aria-hidden="true"
      data-testid="category-icon"
      className={`flex shrink-0 items-center justify-center rounded-card ${toneClass[tone]}`}
    >
      <Glyph data-icon={category} size={24} strokeWidth={1.5} />
    </span>
  )
}
