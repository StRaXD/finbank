import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { ApiProvider } from '../../api/ApiProvider.tsx'
import type { FinbankApi } from '../../api/port.ts'
import { ApiError, type Account, type IsoDate, type ListTransactionsInput, type Transaction } from '../../api/types.ts'
import { AccountDetailsPage } from './AccountDetailsPage.tsx'

const checking: Account = {
  id: 'acc_2',
  type: 'checking',
  bankName: 'AB Bank Ltd.',
  branchName: 'Park Street Branch',
  network: 'visa',
  accountNumber: '6934566991234',
  balanceCents: 2_505_600,
}

const credit: Account = {
  id: 'acc_1',
  type: 'creditCard',
  bankName: 'AB Bank Ltd.',
  branchName: 'A',
  network: 'mastercard',
  accountNumber: '3388455688602598',
  balanceCents: 1_200_000,
}

/** 34 rows, newest first, alternating acc_1 / acc_2: 17 per account. */
const transactions: Transaction[] = Array.from({ length: 34 }, (_, i) => {
  const revenue = i % 4 === 1
  const t: Transaction = {
    id: `txn_${i + 1}`,
    accountId: i % 2 === 0 ? 'acc_1' : 'acc_2',
    item: `Item ${i + 1}`,
    shop: `Shop ${i + 1}`,
    kind: revenue ? 'revenue' : 'expense',
    paymentMethod: i % 2 === 0 ? 'Credit Card' : 'Debit Card',
    status: i === 3 ? 'pending' : 'complete',
    type: revenue ? 'credit' : 'debit',
    receiptId: `RCPT${String(i + 1).padStart(7, '0')}`,
    amountCents: 10_000 + i,
    date: `2023-05-${String(Math.max(1, 17 - Math.floor(i / 2))).padStart(2, '0')}` as IsoDate,
    icon: 'food',
  }
  if (!revenue) t.category = 'food'
  return t
})

function statefulApi(overrides: Partial<FinbankApi> = {}) {
  let accounts = [structuredClone(credit), structuredClone(checking)]
  let rows = structuredClone(transactions)
  const listTransactions = vi.fn(({ accountId, cursor, limit }: ListTransactionsInput) => {
    const filtered = rows.filter((t) => accountId === undefined || t.accountId === accountId)
    const offset = cursor === undefined ? 0 : Number(cursor)
    const end = offset + limit
    return Promise.resolve({
      items: structuredClone(filtered.slice(offset, end)),
      nextCursor: end < filtered.length ? String(end) : null,
    })
  })
  const removeAccount = vi.fn((id: string) => {
    accounts = accounts.filter((a) => a.id !== id)
    rows = rows.filter((t) => t.accountId !== id)
    return Promise.resolve()
  })
  const api = {
    getAccount: vi.fn((id: string) => Promise.resolve(structuredClone(accounts.find((a) => a.id === id) ?? null))),
    listAccounts: () => Promise.resolve(structuredClone(accounts)),
    listTransactions,
    removeAccount,
    ...overrides,
  } as FinbankApi
  return { api, removeAccount, listTransactions }
}

function renderAt(path: string, api: FinbankApi) {
  const router = createMemoryRouter(
    [
      { path: '/balances', element: <p>balances page</p> },
      { path: '/balances/:accountId', element: <AccountDetailsPage balancesPath="/balances" /> },
    ],
    { initialEntries: [path] },
  )
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <ApiProvider api={api}>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </ApiProvider>,
  )
  return { router, queryClient }
}

const historyRows = () =>
  within(screen.getByRole('table', { name: 'Transactions History' })).getAllByRole('row').slice(1)

async function openRemove() {
  const details = await screen.findByTestId('account-details')
  fireEvent.click(within(details).getByRole('button', { name: 'Remove' }))
  return screen.getByRole('dialog', { name: 'Remove account?' })
}

describe('AccountDetailsPage', () => {
  it('shows the title and a skeleton while the account loads', () => {
    renderAt('/balances/acc_2', statefulApi({ getAccount: () => new Promise<Account | null>(() => {}) }).api)
    expect(screen.getByRole('heading', { level: 1, name: 'Account Details' })).toBeInTheDocument()
    expect(screen.getByTestId('skeleton')).toBeInTheDocument()
    expect(screen.queryByTestId('account-details')).not.toBeInTheDocument()
  })

  it('shows the account details, matching its Balances card, and the actions', async () => {
    const { api } = statefulApi()
    renderAt('/balances/acc_2', api)
    const details = await screen.findByTestId('account-details')
    const pairs = within(details)
      .getAllByRole('term')
      .map((term) => [term.textContent, term.nextElementSibling?.textContent])
    expect(pairs).toEqual([
      ['Bank Name', 'AB Bank Ltd.'],
      ['Account Type', 'Checking'],
      ['Balance', '$25,056.00'],
      ['Branch Name', 'Park Street Branch'],
      ['Account Number', '693 456 699****'],
    ])
    expect(api.getAccount).toHaveBeenCalledWith('acc_2')
    const edit = within(details).getByRole('button', { name: 'Edit Details' })
    const remove = within(details).getByRole('button', { name: 'Remove' })
    expect(edit.compareDocumentPosition(remove) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    // Grey semibold small text, not the teal text button.
    expect(remove).toHaveClass('text-14', 'font-semibold', 'text-ink-2')
    expect(remove).not.toHaveClass('text-primary')
    for (const button of [edit, remove]) expect(button).not.toHaveAttribute('tabindex', '-1')
  })

  it('keeps Edit Details inert', async () => {
    const { api, removeAccount } = statefulApi()
    const { router } = renderAt('/balances/acc_2', api)
    fireEvent.click(await screen.findByRole('button', { name: 'Edit Details' }))
    expect(router.state.location.pathname).toBe('/balances/acc_2')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(removeAccount).not.toHaveBeenCalled()
  })

  it("lists only this account's history, newest first, 10 at a time", async () => {
    const { api, listTransactions } = statefulApi()
    renderAt('/balances/acc_2', api)
    expect(await screen.findByRole('region', { name: 'Transactions History' })).toBeInTheDocument()
    await screen.findByRole('table', { name: 'Transactions History' })
    expect(listTransactions).toHaveBeenCalledWith({ kind: undefined, accountId: 'acc_2', limit: 10, cursor: undefined })
    const own = transactions.filter((t) => t.accountId === 'acc_2')
    const receipts = () => historyRows().map((row) => within(row).getAllByRole('cell')[3]!.textContent)
    expect(receipts()).toEqual(own.slice(0, 10).map((t) => t.receiptId))
    const cellTexts = (row: HTMLElement) => within(row).getAllByRole('cell').map((c) => c.textContent)
    expect(cellTexts(historyRows()[0]!)).toEqual(['17 May 2023', 'Complete', 'Credit', 'RCPT0000002', '$100.01'])
    expect(cellTexts(historyRows()[1]!)).toEqual(['16 May 2023', 'Pending', 'Debit', 'RCPT0000004', '$100.03'])

    const loadMore = screen.getByRole('button', { name: 'Load More' })
    expect(loadMore).not.toHaveAttribute('tabindex', '-1')
    fireEvent.click(loadMore)
    await waitFor(() => expect(historyRows()).toHaveLength(own.length))
    expect(receipts()).toEqual(own.map((t) => t.receiptId))
    expect(screen.queryByRole('button', { name: 'Load More' })).not.toBeInTheDocument()
  })

  it('shows "Account not found" with a link to Balances, and no history, for an unknown id', async () => {
    const { api, listTransactions } = statefulApi()
    const { router } = renderAt('/balances/nope', api)
    expect(await screen.findByText('Account not found.')).toBeInTheDocument()
    const back = screen.getByRole('link', { name: 'Back to Balances' })
    expect(back).toHaveAttribute('href', '/balances')
    expect(screen.queryByTestId('account-details')).not.toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Transactions History' })).not.toBeInTheDocument()
    expect(listTransactions).not.toHaveBeenCalled()
    fireEvent.click(back)
    expect(await screen.findByText('balances page')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/balances')
  })

  it('shows the load error with Retry, and recovers on retry', async () => {
    let fail = true
    const { api } = statefulApi()
    const getAccount = api.getAccount
    api.getAccount = (id) => (fail ? Promise.reject(new ApiError('UNKNOWN', 'Could not load the account.')) : getAccount(id))
    renderAt('/balances/acc_2', api)
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load the account.')
    fail = false
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(await screen.findByTestId('account-details')).toBeInTheDocument()
  })

  it('opens the dialog naming the account, and changes nothing on Cancel or Esc', async () => {
    const { api, removeAccount } = statefulApi()
    const { router } = renderAt('/balances/acc_2', api)
    let dialog = await openRemove()
    expect(
      within(dialog).getByText('Your Checking account at AB Bank Ltd. (693 456 699****) will be removed.'),
    ).toBeInTheDocument()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    dialog = await openRemove()
    fireEvent.keyDown(document.body, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    expect(removeAccount).not.toHaveBeenCalled()
    expect(router.state.location.pathname).toBe('/balances/acc_2')
    expect(screen.getByTestId('account-details')).toBeInTheDocument()
  })

  it('removes the account on confirm while staying here, then replaces the route with Balances', async () => {
    const { api, removeAccount } = statefulApi()
    const { router } = renderAt('/balances', api)
    await act(() => router.navigate('/balances/acc_2'))
    const pathAtRemove: string[] = []
    const remove = removeAccount.getMockImplementation()!
    let finish: () => void = () => {}
    removeAccount.mockImplementation((id: string) => {
      pathAtRemove.push(router.state.location.pathname)
      // Really removes it, so the post-removal refetch of this page's account returns null.
      return new Promise<void>((resolve) => {
        finish = () => void remove(id).then(resolve)
      })
    })
    const dialog = await openRemove()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Remove' }))
    await waitFor(() => expect(removeAccount).toHaveBeenCalledTimes(1))
    expect(removeAccount).toHaveBeenCalledWith('acc_2')
    // Still on Account Details while the removal runs.
    expect(pathAtRemove).toEqual(['/balances/acc_2'])
    expect(router.state.location.pathname).toBe('/balances/acc_2')
    expect(screen.getByTestId('account-details')).toBeInTheDocument()

    // The refetched account is null before the page leaves: "Account not found" must never flash.
    let flashedNotFound = false
    const observer = new MutationObserver(() => {
      if (screen.queryByText('Account not found.')) flashedNotFound = true
    })
    observer.observe(document.body, { childList: true, subtree: true, characterData: true })
    await act(async () => finish())
    expect(await screen.findByText('balances page')).toBeInTheDocument()
    observer.disconnect()
    expect(flashedNotFound).toBe(false)
    expect(router.state.location.pathname).toBe('/balances')
    // Replaced, not pushed: Back never returns to the removed account's details.
    expect(router.state.historyAction).toBe('REPLACE')
    await act(() => router.navigate(-1))
    expect(router.state.location.pathname).not.toBe('/balances/acc_2')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('stays on Account Details with the error in the dialog when the removal fails, and can retry', async () => {
    let fail = true
    const { api, removeAccount } = statefulApi()
    const remove = removeAccount.getMockImplementation()!
    removeAccount.mockImplementation((id: string) =>
      fail ? Promise.reject(new ApiError('STORAGE_FULL', 'Your browser storage is full. Free some space and try again.')) : remove(id),
    )
    const { router } = renderAt('/balances/acc_2', api)
    const dialog = await openRemove()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Remove' }))
    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      'Your browser storage is full. Free some space and try again.',
    )
    expect(router.state.location.pathname).toBe('/balances/acc_2')
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByTestId('account-details')).toBeInTheDocument()

    fail = false
    fireEvent.click(within(dialog).getByRole('button', { name: 'Remove' }))
    expect(await screen.findByText('balances page')).toBeInTheDocument()
    expect(removeAccount).toHaveBeenCalledTimes(2)
  })
})
