import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { ApiProvider } from '../../api/ApiProvider.tsx'
import type { FinbankApi } from '../../api/port.ts'
import { ApiError, type IsoDate, type ListTransactionsInput, type Transaction } from '../../api/types.ts'
import { TransactionList } from './components/TransactionList.tsx'
import { TransactionsPage } from './TransactionsPage.tsx'

/** 23 rows, newest first: every third one is revenue. */
const fixture: Transaction[] = Array.from({ length: 23 }, (_, i) => {
  const revenue = i % 3 === 2
  const day = String(28 - i).padStart(2, '0')
  const t: Transaction = {
    id: `txn_${i + 1}`,
    accountId: i % 2 === 0 ? 'acc_1' : 'acc_2',
    item: i === 0 ? 'GTR 5' : `Item ${i + 1}`,
    shop: i === 0 ? 'Gadget & Gear' : `Shop ${i + 1}`,
    kind: revenue ? 'revenue' : 'expense',
    paymentMethod: i % 2 === 0 ? 'Credit Card' : 'Debit Card',
    status: 'complete',
    type: revenue ? 'credit' : 'debit',
    receiptId: '8C52d5DKDJ5',
    amountCents: i === 0 ? 1_234_550 : 1_000 + i,
    date: `2023-04-${day}` as IsoDate,
    icon: i === 0 ? 'gadget' : 'food',
  }
  if (!revenue) t.category = 'food'
  return t
})

/** A hand-built `listTransactions` paging over `rows` with a numeric cursor. */
function pagedList(rows: Transaction[] = fixture) {
  return vi.fn(({ kind, accountId, cursor, limit }: ListTransactionsInput) => {
    const filtered = rows.filter(
      (t) => (kind === undefined || t.kind === kind) && (accountId === undefined || t.accountId === accountId),
    )
    const offset = cursor === undefined ? 0 : Number(cursor)
    const end = offset + limit
    return Promise.resolve({
      items: structuredClone(filtered.slice(offset, end)),
      nextCursor: end < filtered.length ? String(end) : null,
    })
  })
}

function renderWith(listTransactions: FinbankApi['listTransactions'], ui: ReactNode = <TransactionsPage />) {
  const api = { listTransactions } as FinbankApi
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <ApiProvider api={api}>
      <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
    </ApiProvider>,
  )
}

const bodyRows = () => within(screen.getByRole('table')).getAllByRole('row').slice(1)
const itemNames = () => bodyRows().map((row) => within(row).getAllByRole('cell')[0]!.textContent)

describe('TransactionsPage', () => {
  it('shows the title, the tabs with All selected, and a skeleton while loading', () => {
    renderWith(() => new Promise(() => {}))
    expect(screen.getByRole('heading', { level: 1, name: 'Recent Transaction' })).toHaveClass('text-22', 'text-subtle')
    expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual(['All', 'Revenue', 'Expenses'])
    expect(screen.getByRole('tab', { name: 'All' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByTestId('skeleton')).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('renders the columns and formats a row', async () => {
    const list = pagedList()
    renderWith(list)
    const table = await screen.findByRole('table', { name: 'Transactions' })
    expect(list).toHaveBeenCalledWith({ kind: undefined, accountId: undefined, limit: 10, cursor: undefined })
    expect(within(table).getAllByRole('columnheader').map((h) => h.textContent)).toEqual([
      'Items',
      'Shop Name',
      'Date',
      'Payment Method',
      'Amount',
    ])
    expect(bodyRows()).toHaveLength(10)
    const cells = within(bodyRows()[0]!).getAllByRole('cell')
    expect(cells.map((c) => c.textContent)).toEqual([
      'GTR 5',
      'Gadget & Gear',
      '28 Apr 2023',
      'Credit Card',
      '$12,345.50',
    ])
    expect(cells[0]!.querySelector('[data-icon="gadget"]')).not.toBeNull()
    expect(cells[4]).toHaveClass('text-right')
    // Revenue looks like expense: no sign and no colour.
    const revenueAmount = within(bodyRows()[2]!).getAllByRole('cell')[4]!
    expect(revenueAmount.textContent).toBe('$10.02')
    expect(revenueAmount.innerHTML).not.toMatch(/positive|danger/)
  })

  it('appends 10 rows per Load More and hides it once every row is shown', async () => {
    const list = pagedList()
    renderWith(list)
    await screen.findByRole('table')
    fireEvent.click(screen.getByRole('button', { name: 'Load More' }))
    await waitFor(() => expect(bodyRows()).toHaveLength(20))
    expect(list).toHaveBeenLastCalledWith({ kind: undefined, accountId: undefined, limit: 10, cursor: '10' })
    expect(itemNames().slice(0, 11)).toEqual(fixture.slice(0, 11).map((t) => t.item))
    fireEvent.click(screen.getByRole('button', { name: 'Load More' }))
    await waitFor(() => expect(bodyRows()).toHaveLength(23))
    expect(screen.queryByRole('button', { name: 'Load More' })).not.toBeInTheDocument()
  })

  it('filters by tab, and going back to All restarts at the newest rows', async () => {
    const list = pagedList()
    renderWith(list)
    await screen.findByRole('table')
    fireEvent.click(screen.getByRole('button', { name: 'Load More' }))
    await waitFor(() => expect(bodyRows()).toHaveLength(20))

    fireEvent.click(screen.getByRole('tab', { name: 'Revenue' }))
    expect(screen.getByRole('tab', { name: 'Revenue' })).toHaveAttribute('aria-selected', 'true')
    const revenue = fixture.filter((t) => t.kind === 'revenue')
    await waitFor(() => expect(itemNames()).toEqual(revenue.map((t) => t.item)))
    expect(list).toHaveBeenLastCalledWith({ kind: 'revenue', accountId: undefined, limit: 10, cursor: undefined })
    expect(screen.queryByRole('button', { name: 'Load More' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('tab', { name: 'Expenses' }))
    await waitFor(() => expect(bodyRows()).toHaveLength(10))
    expect(itemNames()).toEqual(fixture.filter((t) => t.kind === 'expense').slice(0, 10).map((t) => t.item))

    fireEvent.click(screen.getByRole('tab', { name: 'All' }))
    await waitFor(() => expect(itemNames()).toEqual(fixture.slice(0, 10).map((t) => t.item)))
    expect(screen.getByRole('button', { name: 'Load More' })).toBeInTheDocument()
  })

  it('shows the empty line when there are no transactions', async () => {
    renderWith(pagedList([]))
    expect(await screen.findByText('No transactions yet.')).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Load More' })).not.toBeInTheDocument()
  })

  it('shows the error with Retry, and recovers on retry', async () => {
    const ok = pagedList()
    let fail = true
    renderWith((input) =>
      fail ? Promise.reject(new ApiError('UNKNOWN', 'Could not load transactions.')) : ok(input),
    )
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load transactions.')
    fail = false
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    await waitFor(() => expect(bodyRows()).toHaveLength(10))
  })

  it('keeps the loaded rows and shows an alert when Load More fails, then retries', async () => {
    const ok = pagedList()
    let failNext = false
    renderWith((input) =>
      failNext && input.cursor ? Promise.reject(new ApiError('UNKNOWN', 'Could not load more.')) : ok(input),
    )
    await screen.findByRole('table')
    failNext = true
    fireEvent.click(screen.getByRole('button', { name: 'Load More' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load more.')
    expect(bodyRows()).toHaveLength(10)
    failNext = false
    fireEvent.click(screen.getByRole('button', { name: 'Load More' }))
    await waitFor(() => expect(bodyRows()).toHaveLength(20))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})

describe('TransactionList compact', () => {
  it('renders the name over the shop and the amount over the date, without Load More', async () => {
    const list = pagedList()
    renderWith(list, <TransactionList variant="compact" kind="expense" limit={5} />)
    const items = await screen.findAllByRole('listitem')
    expect(items).toHaveLength(5)
    expect(list).toHaveBeenCalledWith({ kind: 'expense', accountId: undefined, limit: 5, cursor: undefined })
    const first = items[0]!
    expect(first.querySelector('[data-icon="gadget"]')).not.toBeNull()
    expect(within(first).getByText('GTR 5')).toBeInTheDocument()
    expect(within(first).getByText('Gadget & Gear')).toBeInTheDocument()
    expect(within(first).getByText('$12,345.50')).toBeInTheDocument()
    expect(within(first).getByText('28 Apr 2023')).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Load More' })).not.toBeInTheDocument()
  })

  it('renders the history variant for one account, with compact rows and Load More', async () => {
    const rows = fixture.map((t, i) => (i === 1 ? { ...t, status: 'pending' as const } : t))
    const list = pagedList(rows)
    renderWith(list, <TransactionList variant="history" accountId="acc_2" limit={10} loadMore />)
    const table = await screen.findByRole('table', { name: 'Transactions History' })
    expect(list).toHaveBeenCalledWith({ kind: undefined, accountId: 'acc_2', limit: 10, cursor: undefined })
    expect(within(table).getAllByRole('columnheader').map((h) => h.textContent)).toEqual([
      'Date',
      'Status',
      'Transaction Type',
      'Receipt',
      'Amount',
    ])
    expect(bodyRows()).toHaveLength(10)
    const accountRows = rows.filter((t) => t.accountId === 'acc_2')
    const first = within(bodyRows()[0]!).getAllByRole('cell')
    const t = accountRows[0]!
    expect(first.map((cell) => cell.textContent)).toEqual([
      '27 Apr 2023',
      'Pending',
      t.kind === 'revenue' ? 'Credit' : 'Debit',
      '8C52d5DKDJ5',
      '$10.01',
    ])
    const aligns = ['text-left', 'text-center', 'text-center', 'text-center', 'text-right']
    first.forEach((cell, i) => expect(cell).toHaveClass(aligns[i]!))
    expect(first[0]).toHaveClass('py-3.75')
    expect(within(first[4]!).getByText('$10.01')).toHaveClass('font-bold')
    expect(table.querySelector('[data-icon]')).toBeNull()
    expect(within(bodyRows()[1]!).getAllByRole('cell')[1]).toHaveTextContent('Complete')
    expect(bodyRows().map((row) => within(row).getAllByRole('cell')[2]!.textContent)).toContain('Credit')

    fireEvent.click(screen.getByRole('button', { name: 'Load More' }))
    await waitFor(() => expect(bodyRows()).toHaveLength(accountRows.length))
    expect(screen.queryByRole('button', { name: 'Load More' })).not.toBeInTheDocument()
  })

  it('filters by account', async () => {
    const list = pagedList()
    renderWith(list, <TransactionList variant="table" accountId="acc_2" limit={10} />)
    await screen.findByRole('table')
    expect(list).toHaveBeenCalledWith({ kind: undefined, accountId: 'acc_2', limit: 10, cursor: undefined })
    expect(bodyRows().every((row) => within(row).getAllByRole('cell')[3]!.textContent === 'Debit Card')).toBe(true)
  })
})
