import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ApiProvider } from '../../api/ApiProvider.tsx'
import type { FinbankApi } from '../../api/port.ts'
import {
  ApiError,
  type CategorySummary,
  type ComparisonPoint,
  type IsoDate,
  type Transaction,
} from '../../api/types.ts'
import { ExpensesPage } from './ExpensesPage.tsx'

const item = (patch: Partial<Transaction> & Pick<Transaction, 'id' | 'item'>): Transaction => ({
  accountId: 'acc_1',
  shop: 'Shop',
  kind: 'expense',
  category: 'shopping',
  paymentMethod: 'Credit Card',
  status: 'complete',
  type: 'debit',
  receiptId: 'ABCDEFGHIJK',
  amountCents: 16_000,
  date: '2023-05-17' as IsoDate,
  icon: 'shopping',
  ...patch,
})

/** Already derived, as the adapter returns them; the page must show these numbers as given. */
const fixture: CategorySummary[] = [
  {
    category: 'housing',
    totalCents: 202_300,
    changePct: -11,
    recentItems: [
      item({ id: 'h1', item: 'Electricity bill', amountCents: 6_800, date: '2023-05-14' as IsoDate }),
      item({ id: 'h2', item: 'Rent', amountCents: 120_000, date: '2023-05-10' as IsoDate }),
    ],
  },
  { category: 'food', totalCents: 0, changePct: -100, recentItems: [] },
  { category: 'transportation', totalCents: 22_000, changePct: 0, recentItems: [item({ id: 't1', item: 'Taxi fare' })] },
  { category: 'entertainment', totalCents: 54_999, changePct: 409, recentItems: [item({ id: 'e1', item: 'Movie ticket' })] },
  { category: 'shopping', totalCents: 84_900, changePct: -24, recentItems: [item({ id: 's1', item: 'GTR 5' })] },
  { category: 'others', totalCents: 370_240, changePct: -10, recentItems: [item({ id: 'o1', item: 'Gift' })] },
]

const comparison: ComparisonPoint[] = [
  { label: 'Jan', currentCents: 520_000, previousCents: 420_000 },
  { label: 'Feb', currentCents: null, previousCents: 680_000 },
]

function renderWith(
  listCategorySummaries: FinbankApi['listCategorySummaries'],
  getComparison: FinbankApi['getComparison'] = () => Promise.resolve(structuredClone(comparison)),
) {
  const api = { listCategorySummaries, getComparison } as FinbankApi
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <ApiProvider api={api}>
      <QueryClientProvider client={queryClient}>
        <ExpensesPage />
      </QueryClientProvider>
    </ApiProvider>,
  )
}

describe('ExpensesPage', () => {
  it('shows the Breakdown empty message when the adapter returns no summaries', async () => {
    renderWith(() => Promise.resolve([]))
    expect(await screen.findByText('No expenses this month')).toBeInTheDocument()
    expect(screen.queryAllByRole('article')).toHaveLength(0)
  })

  it('has a visually hidden h1, both section titles and a skeleton per section while loading', () => {
    renderWith(
      () => new Promise(() => {}),
      () => new Promise(() => {}),
    )
    expect(screen.getByRole('heading', { level: 1, name: 'Expenses' })).toHaveClass('sr-only')
    const titles = screen.getAllByRole('heading', { level: 2 })
    expect(titles.map((h) => h.textContent)).toEqual(['Expenses Comparison', 'Expenses Breakdown'])
    for (const title of titles) expect(title).toHaveClass('text-22', 'text-subtle')
    const comparison = screen.getByRole('region', { name: 'Expenses Comparison' })
    const breakdown = screen.getByRole('region', { name: 'Expenses Breakdown' })
    // Section titles sit 16px above their content.
    expect(comparison).toHaveClass('gap-4')
    expect(breakdown).toHaveClass('gap-4')
    expect(within(comparison).getByTestId('skeleton')).toBeInTheDocument()
    expect(within(breakdown).getByTestId('skeleton')).toBeInTheDocument()
  })

  it('shows the Monthly comparison chart above the breakdown', async () => {
    renderWith(() => Promise.resolve(structuredClone(fixture)))
    const comparison = screen.getByRole('region', { name: 'Expenses Comparison' })
    expect(within(comparison).getByRole('button', { name: /Monthly Comparison/ })).toBeInTheDocument()
    expect(await within(comparison).findByText(/Jan: this year \$5,200, last year \$4,200\./)).toHaveClass('sr-only')
    const breakdown = screen.getByRole('region', { name: 'Expenses Breakdown' })
    expect(comparison.compareDocumentPosition(breakdown) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('renders six category cards in order in a 3-column grid', async () => {
    renderWith(() => Promise.resolve(structuredClone(fixture)))
    const cards = await screen.findAllByRole('article')
    expect(cards.map((c) => within(c).getByRole('heading', { level: 3 }).textContent)).toEqual([
      'Housing',
      'Food',
      'Transportation',
      'Entertainment',
      'Shopping',
      'Others',
    ])
    expect(screen.getByTestId('category-grid')).toHaveClass('grid', 'grid-cols-3', 'gap-6')
  })

  it('shows the header numbers and the recent items as given by the adapter', async () => {
    renderWith(() => Promise.resolve(structuredClone(fixture)))
    const housing = await screen.findByRole('article', { name: 'Housing' })
    expect(within(housing).getByText('$2,023.00')).toHaveClass('text-20', 'font-bold', 'text-ink')
    expect(within(housing).getByTestId('trend')).toHaveTextContent('11% decrease')
    expect(within(housing).getByText('Compare to last month')).toBeInTheDocument()
    const rows = within(housing).getAllByRole('listitem')
    expect(rows.map((r) => r.textContent)).toEqual(['Electricity bill$68.0014 May 2023', 'Rent$1,200.0010 May 2023'])
    const entertainment = screen.getByRole('article', { name: 'Entertainment' })
    expect(within(entertainment).getByTestId('trend')).toHaveTextContent('409% increase')
    const transportation = screen.getByRole('article', { name: 'Transportation' })
    expect(within(transportation).getByTestId('trend')).toHaveTextContent(/^00%$/)
  })

  it('shows "No expenses this month" for a category without items', async () => {
    renderWith(() => Promise.resolve(structuredClone(fixture)))
    const food = await screen.findByRole('article', { name: 'Food' })
    expect(within(food).getByText('No expenses this month')).toBeInTheDocument()
    expect(within(food).getByText('$0.00')).toBeInTheDocument()
    expect(within(food).queryByRole('listitem')).not.toBeInTheDocument()
  })

  it('has nothing focusable inside the cards', async () => {
    const { container } = renderWith(() => Promise.resolve(structuredClone(fixture)))
    await screen.findAllByRole('article')
    expect(container.querySelectorAll('article a, article button, article input, article [tabindex]')).toHaveLength(0)
  })

  it('shows an inline error with Retry that refetches', async () => {
    const list = vi
      .fn<FinbankApi['listCategorySummaries']>()
      .mockRejectedValueOnce(new ApiError('UNKNOWN', 'Could not load expenses.'))
      .mockResolvedValue(structuredClone(fixture))
    renderWith(list)
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load expenses.')
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    await waitFor(() => expect(screen.getAllByRole('article')).toHaveLength(6))
    expect(list).toHaveBeenCalledTimes(2)
  })
})
