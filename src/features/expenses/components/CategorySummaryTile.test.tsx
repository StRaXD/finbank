import { fireEvent, render, screen, within } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it } from 'vitest'
import type { CategorySummary } from '../../../api/types.ts'
import { CategorySummaryTile } from './CategorySummaryTile.tsx'

const summary = (over: Partial<CategorySummary> = {}): CategorySummary => ({
  category: 'housing',
  totalCents: 202_300,
  changePct: -11,
  recentItems: [],
  ...over,
})

function renderTile(s: CategorySummary) {
  const router = createMemoryRouter(
    [
      { path: '/', element: <CategorySummaryTile summary={s} expensesPath="/all-expenses" /> },
      { path: '/all-expenses', element: <p>expenses page</p> },
    ],
    { initialEntries: ['/'] },
  )
  render(<RouterProvider router={router} />)
  return router
}

describe('CategorySummaryTile', () => {
  it('shows the icon, name, adapter total and "%*" trend as given', () => {
    renderTile(summary())
    const tile = screen.getByRole('article', { name: 'Housing' })
    expect(within(tile).getByTestId('category-icon')).toHaveClass('bg-surface', 'text-subtle')
    expect(within(tile).getByRole('heading', { level: 3, name: 'Housing' })).toHaveClass('text-14')
    expect(within(tile).getByText('$2,023.00')).toHaveClass('font-bold')
    expect(within(tile).getByTestId('trend')).toHaveTextContent('11%*decrease')
    expect(within(tile).getByTestId('trend').querySelector('[data-icon="arrowDown"]')).toHaveClass('text-positive')
  })

  it('shows a zero change as a muted "00%*" with no arrow', () => {
    renderTile(summary({ category: 'food', changePct: 0 }))
    expect(screen.getByTestId('trend')).toHaveTextContent(/^00%\*$/)
    expect(screen.getByTestId('trend').firstElementChild).toHaveClass('text-muted')
    expect(screen.getByTestId('trend').querySelector('svg')).toBeNull()
  })

  it('makes only the → arrow a link, grey with teal hover and focus states', () => {
    renderTile(summary({ category: 'entertainment', changePct: 409 }))
    const links = screen.getAllByRole('link')
    expect(links).toHaveLength(1)
    const link = screen.getByRole('link', { name: 'View Entertainment expenses' })
    expect(link).toHaveAttribute('href', '/all-expenses')
    expect(link).toHaveClass('text-subtle', 'hover:text-primary', 'focus-visible:text-primary')
    expect(link.querySelector('[data-icon="arrowRight"]')).toHaveAttribute('aria-hidden', 'true')
    expect(screen.getByRole('article').closest('a')).toBeNull()
  })

  it('navigates to the Expenses path from the → arrow', async () => {
    const router = renderTile(summary({ category: 'food' }))
    fireEvent.click(screen.getByRole('link', { name: 'View Food expenses' }))
    expect(await screen.findByText('expenses page')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/all-expenses')
  })
})
