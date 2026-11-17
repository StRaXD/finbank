import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { ApiProvider } from '../../api/ApiProvider.tsx'
import type { FinbankApi } from '../../api/port.ts'
import { qk } from '../../api/queryKeys.ts'
import {
  ApiError,
  type Account,
  type Bill,
  type CategorySummary,
  type ComparisonGranularity,
  type ComparisonPoint,
  type IsoDate,
  type ListBillsInput,
  type ListTransactionsInput,
  type Transaction,
} from '../../api/types.ts'
import { formatDate, formatMoney } from '../../lib/format.ts'
import { OverviewPage } from './index.ts'

const accounts: Account[] = [
  {
    id: 'acc_1',
    type: 'creditCard',
    bankName: 'AB Bank Ltd.',
    branchName: 'A',
    network: 'mastercard',
    accountNumber: '3388455688602598',
    balanceCents: 1_200_000,
  },
  {
    id: 'acc_2',
    type: 'checking',
    bankName: 'AB Bank Ltd.',
    branchName: 'Park Street Branch',
    network: 'visa',
    accountNumber: '6934566991234',
    balanceCents: 2_505_600,
  },
  { id: 'acc_3', type: 'savings', bankName: 'B', branchName: 'B', accountNumber: '13345688681234', balanceCents: 18_000_000 },
  { id: 'acc_4', type: 'investment', bankName: 'C', branchName: 'C', accountNumber: '69845686624471', balanceCents: 7_534_300 },
  { id: 'acc_5', type: 'loan', bankName: 'D', branchName: 'D', accountNumber: '36345689663390', balanceCents: 2_800_000 },
]

/** The adapter's derived total for the fixture: assets minus liabilities. */
const fixtureTotalCents = 24_039_900

const bills: Bill[] = [
  {
    id: 'bill_1',
    vendor: 'Figma',
    logo: 'figma',
    title: 'Figma - Yearly Plan',
    description: 'Figma plan blurb.',
    billingCycle: 'yearly',
    dueDate: '2023-05-25' as IsoDate,
    lastChargeDate: '2022-05-25' as IsoDate,
    amountCents: 15_049,
  },
  {
    id: 'bill_2',
    vendor: 'Adobe',
    logo: 'adobe',
    title: 'Adobe - Yearly',
    description: 'Adobe plan blurb.',
    billingCycle: 'yearly',
    dueDate: '2023-06-16' as IsoDate,
    lastChargeDate: '2022-06-16' as IsoDate,
    amountCents: 55_850,
  },
  {
    id: 'bill_3',
    vendor: 'Google',
    logo: 'google',
    title: 'Google One',
    description: 'Storage.',
    billingCycle: 'monthly',
    dueDate: '2023-06-18' as IsoDate,
    lastChargeDate: '2023-05-18' as IsoDate,
    amountCents: 999,
  },
]

/** 21 rows, newest first: every third one is revenue (7 revenue, 14 expense). */
const transactions: Transaction[] = Array.from({ length: 21 }, (_, i) => {
  const revenue = i % 3 === 2
  const t: Transaction = {
    id: `txn_${i + 1}`,
    accountId: 'acc_1',
    item: `Item ${i + 1}`,
    shop: `Shop ${i + 1}`,
    kind: revenue ? 'revenue' : 'expense',
    paymentMethod: 'Credit Card',
    status: 'complete',
    type: revenue ? 'credit' : 'debit',
    receiptId: 'R1',
    amountCents: 1_000 + i,
    date: `2023-05-${String(28 - i).padStart(2, '0')}` as IsoDate,
    icon: 'food',
  }
  if (!revenue) t.category = 'food'
  return t
})

/** Already derived, as the adapter returns them: the seed's week of 14 May and a short year. */
const weekLabels = ['14 Sun', '15 Mon', '16 Tue', '17 Wed', '18 Thu', '19 Fri', '20 Sat']
const comparison: Record<ComparisonGranularity, ComparisonPoint[]> = {
  week: weekLabels.map((label, i) => ({
    label,
    currentCents: i === 6 ? null : [6_800, 4_520, 0, 26_700, 0, 0][i]!,
    previousCents: [120_000, 0, 45_000, 0, 80_000, 299_499, 0][i]!,
  })),
  year: [
    { label: 'Jan', currentCents: 520_000, previousCents: 420_000 },
    { label: 'Feb', currentCents: null, previousCents: 3_000_000 },
  ],
}

/** Already derived, as the adapter returns them, in the fixed category order. */
const summaries: CategorySummary[] = [
  { category: 'housing', totalCents: 202_300, changePct: -11, recentItems: [] },
  { category: 'food', totalCents: 8_370, changePct: 0, recentItems: [] },
  { category: 'transportation', totalCents: 22_000, changePct: -62, recentItems: [] },
  { category: 'entertainment', totalCents: 54_999, changePct: 409, recentItems: [] },
  { category: 'shopping', totalCents: 84_900, changePct: -24, recentItems: [] },
  { category: 'others', totalCents: 370_240, changePct: -10, recentItems: [] },
]

const detailsPath = (id: string) => `/details/${id}`

type OverviewApi = Pick<
  FinbankApi,
  'listAccounts' | 'getBalanceSummary' | 'listBills' | 'listTransactions' | 'getComparison' | 'listCategorySummaries'
>

const listBills = (list: Bill[] = bills) =>
  vi.fn(({ limit }: ListBillsInput = {}) => Promise.resolve(structuredClone(list.slice(0, limit))))

const listTransactions = (rows: Transaction[] = transactions) =>
  vi.fn(({ kind, limit }: ListTransactionsInput) => {
    const filtered = rows.filter((t) => kind === undefined || t.kind === kind)
    return Promise.resolve({
      items: structuredClone(filtered.slice(0, limit)),
      nextCursor: limit < filtered.length ? String(limit) : null,
    })
  })

function seededApi(list: Account[] = accounts, totalBalanceCents = fixtureTotalCents): OverviewApi {
  return {
    listAccounts: () => Promise.resolve(structuredClone(list)),
    getBalanceSummary: () => Promise.resolve({ totalBalanceCents }),
    listBills: listBills(),
    listTransactions: listTransactions(),
    getComparison: vi.fn((g: ComparisonGranularity) => Promise.resolve(structuredClone(comparison[g]))),
    listCategorySummaries: vi.fn(() => Promise.resolve(structuredClone(summaries))),
  }
}

function renderPage(overrides: Partial<OverviewApi> = {}) {
  const api: OverviewApi = { ...seededApi(), ...overrides }
  const router = createMemoryRouter(
    [
      {
        path: '/',
        element: <OverviewPage accountDetailsPath={detailsPath} billsPath="/all-bills" expensesPath="/all-expenses" transactionsPath="/all-txns" />,
      },
      { path: '/details/:id', element: <p>details page</p> },
      { path: '/all-bills', element: <p>bills page</p> },
      { path: '/all-txns', element: <p>transactions page</p> },
      { path: '/all-expenses', element: <p>expenses page</p> },
    ],
    { initialEntries: ['/'] },
  )
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <ApiProvider api={api as FinbankApi}>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </ApiProvider>,
  )
  return { router, queryClient, api }
}

const card = () => screen.getByRole('region', { name: 'Total Balance' })
const billCard = () => screen.getByRole('region', { name: 'Upcoming Bill' })
const txnCard = () => screen.getByRole('region', { name: 'Recent Transaction' })
const txnItems = () => within(txnCard()).getAllByRole('listitem').map((row) => row.textContent)
const txnRow = (t: Transaction) =>
  `${t.item}${t.shop}${formatMoney(t.amountCents, 'exact')}${formatDate(t.date, 'row')}`
const carousel = () => screen.getByRole('region', { name: 'Accounts' })
const slide = () => within(carousel()).getByRole('group')
const dots = () => within(carousel()).getAllByRole('button', { name: /^Show slide/ })
const next = () => within(carousel()).getByRole('button', { name: 'Next' })
const prev = () => within(carousel()).getByRole('button', { name: 'Previous' })

describe('OverviewPage', () => {
  it('places Total Balance, Upcoming Bill, Recent Transaction, Statistics and Expenses Breakdown in the grid, leaving Goals empty', async () => {
    renderPage(seededApi())
    expect(screen.getByRole('heading', { level: 1, name: 'Overview' })).toHaveClass('sr-only')
    expect(screen.getByTestId('overview-grid')).toHaveClass('grid-cols-3')
    await screen.findByRole('region', { name: 'Accounts' })
    expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual([
      'Total Balance',
      'Upcoming Bill',
      'Recent Transaction',
      'Statistics',
      'Expenses Breakdown',
    ])
    expect(screen.getByTestId('slot-total-balance')).toHaveClass('col-start-1', 'row-start-1')
    expect(screen.getByTestId('slot-upcoming-bill')).toHaveClass('col-start-3', 'row-start-1')
    expect(screen.getByTestId('slot-recent-transaction')).toHaveClass('col-start-1', 'row-start-2', 'row-span-2')
    expect(screen.getByTestId('slot-statistics')).toHaveClass('col-span-2', 'col-start-2', 'row-start-2')
    // Row-1 cards stretch to equal height.
    expect(billCard()).toHaveClass('h-full')
    expect(card()).toHaveClass('h-full')
    expect(screen.getByTestId('slot-expenses-breakdown')).toHaveClass('col-span-2', 'col-start-2', 'row-start-3')
    // The Goals slot stays empty.
    expect(screen.getByTestId('overview-grid').children).toHaveLength(5)
  })

  it('shows skeletons while loading', () => {
    renderPage({
      listAccounts: () => new Promise(() => {}),
      getBalanceSummary: () => new Promise(() => {}),
      listBills: () => new Promise(() => {}),
      listTransactions: () => new Promise(() => {}),
    })
    expect(within(card()).getAllByTestId('skeleton')).toHaveLength(2)
    expect(within(billCard()).getByTestId('skeleton')).toBeInTheDocument()
    expect(within(txnCard()).getByTestId('skeleton')).toBeInTheDocument()
    expect(within(card()).getByText('All Accounts')).toBeInTheDocument()
  })

  it('shows the seed: total, All Accounts and the Credit Card slide first, with 5 dots', async () => {
    renderPage(seededApi())
    expect(await within(card()).findByText('$240,399')).toHaveClass('font-extrabold')
    expect(within(card()).getByText('All Accounts')).toBeInTheDocument()
    await screen.findByRole('region', { name: 'Accounts' })
    expect(carousel()).toHaveAttribute('aria-roledescription', 'carousel')
    expect(slide()).toHaveAttribute('aria-label', '1 of 5')
    const first = within(slide()).getByRole('article', { name: 'Credit Card' })
    expect(within(first).getByText('**** **** **** 2598')).toBeInTheDocument()
    expect(within(first).getByText('$12,000')).toBeInTheDocument()
    expect(within(first).getByRole('img', { name: 'Mastercard' })).toBeInTheDocument()
    expect(dots()).toHaveLength(5)
    expect(dots()[0]).toHaveAttribute('aria-current', 'true')
    expect(prev()).toBeDisabled()
    expect(next()).toBeEnabled()
  })

  it('advances to Loan with Next ×4, moving the active dot, then back with Previous', async () => {
    renderPage(seededApi())
    await screen.findByRole('region', { name: 'Accounts' })
    const order = ['Checking', 'Savings', 'Investment', 'Loan']
    order.forEach((name, i) => {
      fireEvent.click(next())
      expect(within(slide()).getByRole('article', { name })).toBeInTheDocument()
      expect(dots()[i + 1]).toHaveAttribute('aria-current', 'true')
    })
    expect(next()).toBeDisabled()
    expect(prev()).toBeEnabled()
    fireEvent.click(prev())
    expect(within(slide()).getByRole('article', { name: 'Investment' })).toBeInTheDocument()
  })

  it('moves with the arrow keys from the slide link, keeping focus inside the carousel', async () => {
    renderPage(seededApi())
    await screen.findByRole('region', { name: 'Accounts' })
    within(slide()).getByRole('link').focus()
    fireEvent.keyDown(document.activeElement!, { key: 'ArrowRight' })
    expect(within(slide()).getByRole('article', { name: 'Checking' })).toBeInTheDocument()
    expect(carousel().contains(document.activeElement)).toBe(true)
    fireEvent.keyDown(document.activeElement!, { key: 'ArrowRight' })
    expect(within(slide()).getByRole('article', { name: 'Savings' })).toBeInTheDocument()
    expect(carousel().contains(document.activeElement)).toBe(true)
    fireEvent.keyDown(document.activeElement!, { key: 'ArrowLeft' })
    expect(within(slide()).getByRole('article', { name: 'Checking' })).toBeInTheDocument()
    expect(document.activeElement).toBe(within(slide()).getByRole('link', { name: 'Open Checking account details' }))
  })

  it('opens the Checking account details from its ↗ link', async () => {
    const { router } = renderPage(seededApi())
    await screen.findByRole('region', { name: 'Accounts' })
    fireEvent.click(next())
    fireEvent.click(within(slide()).getByRole('link', { name: 'Open Checking account details' }))
    expect(await screen.findByText('details page')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/details/acc_2')
  })

  it('clamps to the new last slide when the account list shrinks', async () => {
    const { queryClient } = renderPage(seededApi())
    await screen.findByRole('region', { name: 'Accounts' })
    fireEvent.click(dots()[4]!)
    expect(slide()).toHaveAttribute('aria-label', '5 of 5')
    act(() => queryClient.setQueryData(qk.accounts(), accounts.slice(0, 4)))
    await waitFor(() => expect(slide()).toHaveAttribute('aria-label', '4 of 4'))
    expect(within(slide()).getByRole('article', { name: 'Investment' })).toBeInTheDocument()
    expect(dots()).toHaveLength(4)
  })

  it('shows $0 and the empty line with no accounts', async () => {
    renderPage(seededApi([], 0))
    expect(await within(card()).findByText('$0')).toBeInTheDocument()
    expect(await within(card()).findByText('No accounts yet.')).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Accounts' })).not.toBeInTheDocument()
  })

  it('shows the summary error with Retry in the total only, and recovers', async () => {
    let fail = true
    renderPage({
      ...seededApi(),
      getBalanceSummary: () =>
        fail
          ? Promise.reject(new ApiError('UNKNOWN', 'Could not load the total.'))
          : Promise.resolve({ totalBalanceCents: fixtureTotalCents }),
    })
    expect(await within(card()).findByRole('alert')).toHaveTextContent('Could not load the total.')
    expect(await screen.findByRole('region', { name: 'Accounts' })).toBeInTheDocument()
    fail = false
    fireEvent.click(within(card()).getByRole('button', { name: 'Retry' }))
    expect(await within(card()).findByText('$240,399')).toBeInTheDocument()
  })

  it('shows the accounts error with Retry in the carousel only, and recovers', async () => {
    let fail = true
    renderPage({
      ...seededApi(),
      listAccounts: () =>
        fail ? Promise.reject(new ApiError('UNKNOWN', 'Could not load accounts.')) : Promise.resolve(structuredClone(accounts)),
    })
    expect(await within(card()).findByRole('alert')).toHaveTextContent('Could not load accounts.')
    expect(await within(card()).findByText('$240,399')).toBeInTheDocument()
    fail = false
    fireEvent.click(within(card()).getByRole('button', { name: 'Retry' }))
    await waitFor(() => expect(dots()).toHaveLength(5))
  })

  describe('Upcoming Bill', () => {
    it('shows the next two bills from useBills({ limit: 2 }): badge, vendor, title, last charge and whole amount', async () => {
      const { api } = renderPage()
      const rows = await within(billCard()).findAllByRole('listitem')
      expect(api.listBills).toHaveBeenCalledWith({ limit: 2 })
      expect(rows).toHaveLength(2)
      const [figma, adobe] = rows as [HTMLElement, HTMLElement]
      expect(within(figma).getByRole('img', { name: 'Due May 25' })).toBeInTheDocument()
      expect(within(figma).getByText('Figma')).toBeInTheDocument()
      expect(within(figma).getByText('Figma - Yearly Plan')).toHaveClass('font-bold')
      expect(within(figma).getByText('Last Charge - 25 May 2022')).toBeInTheDocument()
      expect(within(figma).getByText('$150')).toHaveClass('border', 'border-border')
      expect(within(adobe).getByRole('img', { name: 'Due Jun 16' })).toBeInTheDocument()
      expect(within(adobe).getByText('Adobe').parentElement).toHaveClass('text-brand-adobe')
      expect(within(adobe).getByText('Last Charge - 16 Jun 2022')).toBeInTheDocument()
      expect(within(adobe).getByText('$559')).toBeInTheDocument()
      expect(within(billCard()).queryByText('Google')).not.toBeInTheDocument()
    })

    it('shows the empty line with no bills', async () => {
      renderPage({ listBills: listBills([]) })
      expect(await within(billCard()).findByText('No upcoming bills.')).toBeInTheDocument()
    })

    it('shows its error with Retry without affecting the other widgets, and recovers', async () => {
      let fail = true
      const ok = listBills()
      renderPage({
        listBills: (input) => (fail ? Promise.reject(new ApiError('UNKNOWN', 'Could not load bills.')) : ok(input)),
      })
      expect(await within(billCard()).findByRole('alert')).toHaveTextContent('Could not load bills.')
      expect(await within(txnCard()).findAllByRole('listitem')).toHaveLength(5)
      expect(await within(card()).findByText('$240,399')).toBeInTheDocument()
      expect(within(txnCard()).queryByRole('alert')).not.toBeInTheDocument()
      expect(within(card()).queryByRole('alert')).not.toBeInTheDocument()
      fail = false
      fireEvent.click(within(billCard()).getByRole('button', { name: 'Retry' }))
      expect(await within(billCard()).findAllByRole('listitem')).toHaveLength(2)
    })

    it('links View All to the bills page', async () => {
      const { router } = renderPage()
      const link = within(billCard()).getByRole('link', { name: 'View All bills' })
      expect(link).toHaveTextContent('View All')
      expect(within(txnCard()).getByRole('link', { name: 'View All transactions' })).toBeInTheDocument()
      expect(link).toHaveAttribute('href', '/all-bills')
      fireEvent.click(link)
      expect(await screen.findByText('bills page')).toBeInTheDocument()
      expect(router.state.location.pathname).toBe('/all-bills')
    })
  })

  describe('Recent Transaction', () => {
    it('shows the five newest on All from useTransactions({ limit: 5 }), with no Load More', async () => {
      const { api } = renderPage()
      await within(txnCard()).findAllByRole('listitem')
      expect(api.listTransactions).toHaveBeenCalledWith({ limit: 5 })
      expect(within(txnCard()).getByRole('tab', { name: 'All' })).toHaveAttribute('aria-selected', 'true')
      expect(txnItems()).toEqual(transactions.slice(0, 5).map(txnRow))
      expect(within(txnCard()).queryByRole('button', { name: 'Load More' })).not.toBeInTheDocument()
    })

    it.each([
      ['Revenue', 'revenue'],
      ['Expenses', 'expense'],
    ] as const)('shows the five newest of that kind on %s', async (label, kind) => {
      const { api } = renderPage()
      await within(txnCard()).findAllByRole('listitem')
      fireEvent.click(within(txnCard()).getByRole('tab', { name: label }))
      expect(within(txnCard()).getByRole('tab', { name: label })).toHaveAttribute('aria-selected', 'true')
      expect(within(txnCard()).getByRole('tabpanel', { name: label })).toBeInTheDocument()
      const expected = transactions
        .filter((t) => t.kind === kind)
        .slice(0, 5)
        .map(txnRow)
      expect(transactions.filter((t) => t.kind === kind).length).toBeGreaterThan(5)
      expect(expected).toHaveLength(5)
      await waitFor(() => expect(txnItems()).toEqual(expected))
      expect(api.listTransactions).toHaveBeenCalledWith({ kind, limit: 5 })
    })

    it('shows the empty line with no transactions', async () => {
      renderPage({ listTransactions: listTransactions([]) })
      expect(await within(txnCard()).findByText('No transactions yet.')).toBeInTheDocument()
    })

    it('shows its error with Retry without affecting the other widgets, and recovers', async () => {
      let fail = true
      const ok = listTransactions()
      renderPage({
        listTransactions: (input) =>
          fail ? Promise.reject(new ApiError('UNKNOWN', 'Could not load transactions.')) : ok(input),
      })
      expect(await within(txnCard()).findByRole('alert')).toHaveTextContent('Could not load transactions.')
      expect(await within(billCard()).findAllByRole('listitem')).toHaveLength(2)
      expect(within(billCard()).queryByRole('alert')).not.toBeInTheDocument()
      fail = false
      fireEvent.click(within(txnCard()).getByRole('button', { name: 'Retry' }))
      await waitFor(() => expect(txnItems()).toHaveLength(5))
    })

    it('links View All to the transactions page', async () => {
      const { router } = renderPage()
      const link = within(txnCard()).getByRole('link', { name: 'View All transactions' })
      expect(link).toHaveAttribute('href', '/all-txns')
      fireEvent.click(link)
      expect(await screen.findByText('transactions page')).toBeInTheDocument()
      expect(router.state.location.pathname).toBe('/all-txns')
    })
  })

  describe('Statistics', () => {
    const stats = () => screen.getByRole('region', { name: 'Statistics' })
    const axisLabels = (axis: 'x' | 'y') =>
      [...within(stats()).getByTestId('comparison-chart').querySelectorAll(`.recharts-${axis}Axis-tick-labels .recharts-cartesian-axis-tick-value`)].map(
        (t) => t.textContent,
      )

    it('defaults to Weekly Comparison: 14 Sun to 20 Sat on the fitted ladder', async () => {
      const { api } = renderPage()
      expect(within(stats()).getByRole('button', { name: /Comparison period/ })).toHaveTextContent('Weekly Comparison')
      expect(within(stats()).getAllByRole('listitem').map((li) => li.textContent)).toEqual(['This week', 'Last week'])
      expect(await within(stats()).findByText(/^Daily expenses/)).toHaveClass('sr-only')
      expect(api.getComparison).toHaveBeenCalledWith('week')
      expect(api.getComparison).not.toHaveBeenCalledWith('year')
      await waitFor(() => expect(axisLabels('x')).toEqual(weekLabels))
      expect(axisLabels('y')).toEqual(['$0', '$200', '$1k', '$5k', '$25k'])
    })

    it('switches to Monthly Comparison and refits the axis', async () => {
      renderPage()
      await within(stats()).findByText(/^Daily expenses/)
      fireEvent.click(within(stats()).getByRole('button', { name: /Comparison period/ }))
      fireEvent.click(screen.getByRole('option', { name: 'Monthly Comparison' }))
      expect(await within(stats()).findByText(/^Monthly expenses/)).toBeInTheDocument()
      expect(within(stats()).getAllByRole('listitem').map((li) => li.textContent)).toEqual(['This Year', 'Last Year'])
      await waitFor(() => expect(axisLabels('x')).toEqual(['Jan', 'Feb']))
      // $30,000 last February is over $25k, so the ladder moves up to k = 3.
      expect(axisLabels('y')).toEqual(['$0', '$2k', '$10k', '$50k', '$250k'])
    })

    it('shows its error with Retry without affecting the other widgets', async () => {
      renderPage({ getComparison: () => Promise.reject(new ApiError('UNKNOWN', 'Could not load the comparison.')) })
      expect(await within(stats()).findByRole('alert')).toHaveTextContent('Could not load the comparison.')
      expect(await within(card()).findByText('$240,399')).toBeInTheDocument()
      expect(within(card()).queryByRole('alert')).not.toBeInTheDocument()
    })
  })

  describe('Expenses Breakdown', () => {
    const breakdown = () => screen.getByRole('region', { name: 'Expenses Breakdown' })
    const tiles = () => within(breakdown()).getAllByRole('article')

    it('shows the six tiles in order with the adapter totals and "%*" trends, under the caption', async () => {
      const { api } = renderPage()
      expect(within(breakdown()).getByText('*Compare to last month')).toHaveClass('text-14', 'text-subtle')
      await waitFor(() => expect(tiles()).toHaveLength(6))
      expect(api.listCategorySummaries).toHaveBeenCalledTimes(1)
      expect(tiles().map((t) => within(t).getByRole('heading').textContent)).toEqual([
        'Housing',
        'Food',
        'Transportation',
        'Entertainment',
        'Shopping',
        'Others',
      ])
      const housing = within(breakdown()).getByRole('article', { name: 'Housing' })
      expect(within(housing).getByText('$2,023.00')).toBeInTheDocument()
      expect(within(housing).getByTestId('trend')).toHaveTextContent('11%* decrease')
      const entertainment = within(breakdown()).getByRole('article', { name: 'Entertainment' })
      expect(within(entertainment).getByText('$549.99')).toBeInTheDocument()
      expect(within(entertainment).getByTestId('trend')).toHaveTextContent('409%* increase')
      const food = within(breakdown()).getByRole('article', { name: 'Food' })
      expect(within(food).getByTestId('trend')).toHaveTextContent(/^00%\*$/)
      expect(within(breakdown()).getByTestId('category-tile-grid')).toHaveClass('grid-cols-3', 'grid-rows-2')
    })

    it('exposes the six → links in tile order, each to the Expenses path', async () => {
      renderPage()
      await waitFor(() => expect(tiles()).toHaveLength(6))
      const links = within(breakdown()).getAllByRole('link')
      expect(links.map((l) => l.getAttribute('aria-label'))).toEqual([
        'View Housing expenses',
        'View Food expenses',
        'View Transportation expenses',
        'View Entertainment expenses',
        'View Shopping expenses',
        'View Others expenses',
      ])
      for (const link of links) expect(link).toHaveAttribute('href', '/all-expenses')
    })

    it("navigates to Expenses from Food's →", async () => {
      const { router } = renderPage()
      fireEvent.click(await within(breakdown()).findByRole('link', { name: 'View Food expenses' }))
      expect(await screen.findByText('expenses page')).toBeInTheDocument()
      expect(router.state.location.pathname).toBe('/all-expenses')
    })

    it('shows a skeleton while loading, keeping the title and caption', () => {
      renderPage({ listCategorySummaries: () => new Promise(() => {}) })
      expect(within(breakdown()).getByTestId('skeleton')).toBeInTheDocument()
      expect(within(breakdown()).getByText('*Compare to last month')).toBeInTheDocument()
    })

    it('shows its error with Retry inside the card, keeping the title and caption, and recovers', async () => {
      let fail = true
      renderPage({
        listCategorySummaries: () =>
          fail ? Promise.reject(new ApiError('UNKNOWN', 'Could not load categories.')) : Promise.resolve(structuredClone(summaries)),
      })
      expect(await within(breakdown()).findByRole('alert')).toHaveTextContent('Could not load categories.')
      expect(within(breakdown()).getByRole('heading', { level: 2, name: 'Expenses Breakdown' })).toBeInTheDocument()
      expect(within(breakdown()).getByText('*Compare to last month')).toBeInTheDocument()
      expect(await within(card()).findByText('$240,399')).toBeInTheDocument()
      fail = false
      fireEvent.click(within(breakdown()).getByRole('button', { name: 'Retry' }))
      await waitFor(() => expect(tiles()).toHaveLength(6))
    })
  })
})
