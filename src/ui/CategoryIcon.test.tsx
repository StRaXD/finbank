import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { ExpenseCategoryId } from '../api/types.ts'
import { CategoryIcon } from './CategoryIcon.tsx'
import { categoryLabels } from './categoryLabels.ts'

const categories: ExpenseCategoryId[] = ['housing', 'food', 'transportation', 'entertainment', 'shopping', 'others']

describe('CategoryIcon', () => {
  it('labels every category', () => {
    expect(categories.map((c) => categoryLabels[c])).toEqual([
      'Housing',
      'Food',
      'Transportation',
      'Entertainment',
      'Shopping',
      'Others',
    ])
  })

  it.each(categories)('renders the %s glyph on a decorative 40px tile', (category) => {
    render(<CategoryIcon category={category} />)
    const tile = screen.getByTestId('category-icon')
    expect(tile).toHaveAttribute('aria-hidden', 'true')
    expect(tile).toHaveClass('size-10', 'bg-category-tile', 'text-ink-2')
    expect(tile.querySelector(`svg[data-icon="${category}"]`)).not.toBeNull()
  })
})
