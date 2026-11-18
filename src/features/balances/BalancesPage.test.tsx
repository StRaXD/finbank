import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { ApiProvider } from '../../api/ApiProvider.tsx'
import type { FinbankApi } from '../../api/port.ts'
import { ApiError, type Account } from '../../api/types.ts'
import { BalancesPage } from './BalancesPage.tsx'
import { AccountCard } from './index.ts'

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
  {
    id: 'acc_3',
    type: 'savings',
    bankName: 'Brac Bank Ltd.',
    branchName: 'B',
    accountNumber: '13345688681234',
    balanceCents: 18_000_000,
  },
  {
    id: 'acc_4',
    type: 'investment',
    bankName: 'AB Bank Ltd.',
    branchName: 'C',
    accountNumber: '69845686624471',
    balanceCents: 7_534_349,
  },
  {
    id: 'acc_5',
    type: 'loan',
    bankName: 'City Bank Ltd.',
    branchName: 'D',
    accountNumber: '36345689663390',
    balanceCents: 2_800_050,
  },
]

const detailsPath = (id: string) => `/details/${id}`

function renderPage(
  listAccounts: FinbankApi['listAccounts'],
  removeAccount: FinbankApi['removeAccount'] = () => Promise.resolve(),
  createAccount: FinbankApi['createAccount'] = () => Promise.reject(new ApiError('UNKNOWN', 'Not under test.')),
) {
  const api = { listAccounts, removeAccount, createAccount } as FinbankApi
  const router = createMemoryRouter(
    [
      { path: '/balances', element: <BalancesPage accountDetailsPath={detailsPath} /> },
      { path: '/details/:id', element: <p>details page</p> },
    ],
    { initialEntries: ['/balances'] },
  )
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <ApiProvider api={api}>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </ApiProvider>,
  )
  return { router }
}

/** A stateful hand-built adapter: listAccounts reflects removals; `control.fail` makes removals reject. */
function statefulApi() {
  let list = structuredClone(accounts)
  const control = { fail: null as ApiError | null }
  const removeAccount = vi.fn((id: string) => {
    if (control.fail) return Promise.reject(control.fail)
    list = list.filter((a) => a.id !== id)
    return Promise.resolve()
  })
  const listAccounts = () => Promise.resolve(structuredClone(list))
  return { listAccounts, removeAccount, control }
}

async function openRemove(name: string) {
  const card = await screen.findByRole('article', { name })
  const remove = within(card).getByRole('button', { name: 'Remove' })
  remove.focus()
  fireEvent.click(remove)
  return { remove, dialog: screen.getByRole('dialog', { name: 'Remove account?' }) }
}

const loaded = () => Promise.resolve(structuredClone(accounts))

describe('BalancesPage', () => {
  it('renders the title and a skeleton instead of the grid while loading', () => {
    renderPage(() => new Promise<Account[]>(() => {}))
    expect(screen.getByRole('heading', { level: 1, name: 'Balances' })).toBeInTheDocument()
    expect(screen.getByTestId('skeleton')).toBeInTheDocument()
    expect(screen.queryByTestId('account-card')).not.toBeInTheDocument()
    expect(screen.queryByTestId('add-accounts-card')).not.toBeInTheDocument()
  })

  it('renders one card per account in order, then the action card', async () => {
    renderPage(loaded)
    const cards = await screen.findAllByTestId('account-card')
    expect(cards.map((card) => within(card).getByRole('heading', { level: 2 }).textContent)).toEqual([
      'Credit Card',
      'Checking',
      'Savings',
      'Investment',
      'Loan',
    ])
    expect(cards[0]!.parentElement!.lastElementChild).toBe(screen.getByTestId('add-accounts-card'))

    const checking = screen.getByRole('article', { name: 'Checking' })
    expect(within(checking).getByText('AB Bank Ltd.')).toBeInTheDocument()
    expect(within(checking).getByText('693 456 699****')).toBeInTheDocument()
    expect(within(checking).getByText('Account Number')).toBeInTheDocument()
    expect(within(checking).getByText('$25,056')).toBeInTheDocument()
    expect(within(checking).getByText('Total amount')).toBeInTheDocument()
    expect(within(checking).getByRole('img', { name: 'VISA' })).toBeInTheDocument()
    expect(within(checking).getByRole('link', { name: 'Details' })).toHaveAccessibleDescription('Checking')
    expect(within(checking).getByRole('button', { name: 'Remove' })).toHaveAccessibleDescription('Checking')

    const credit = screen.getByRole('article', { name: 'Credit Card' })
    expect(within(credit).getByRole('img', { name: 'Mastercard' })).toBeInTheDocument()
    expect(within(credit).getByText('338 845 568 860****')).toBeInTheDocument()
    expect(within(credit).getByText('$12,000')).toBeInTheDocument()

    // Whole dollars, rounded half-up; liabilities carry no sign.
    expect(within(screen.getByRole('article', { name: 'Investment' })).getByText('$75,343')).toBeInTheDocument()
    const loan = screen.getByRole('article', { name: 'Loan' })
    expect(within(loan).getByText('$28,001')).toBeInTheDocument()
    expect(within(loan).queryByRole('img')).not.toBeInTheDocument()
    expect(within(screen.getByRole('article', { name: 'Savings' })).queryByRole('img')).not.toBeInTheDocument()

    for (const card of cards) {
      expect(within(card).getByRole('button', { name: 'Remove' })).toBeInTheDocument()
    }
    expect(screen.getByRole('button', { name: 'Add Accounts' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Edit Accounts' })).toBeInTheDocument()
  })

  it('links each Details button to its account details path', async () => {
    const { router } = renderPage(loaded)
    const cards = await screen.findAllByTestId('account-card')
    expect(
      cards.map((card) => within(card).getByRole('link', { name: 'Details' }).getAttribute('href')),
    ).toEqual(accounts.map((a) => `/details/${a.id}`))
    fireEvent.click(within(screen.getByRole('article', { name: 'Checking' })).getByRole('link', { name: 'Details' }))
    expect(await screen.findByText('details page')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/details/acc_2')
  })

  it('opens the Add account modal from Add Accounts, and keeps Edit Accounts inert', async () => {
    const { router } = renderPage(loaded)
    await screen.findAllByTestId('account-card')
    fireEvent.click(screen.getByRole('button', { name: 'Edit Accounts' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Add Accounts' }))
    expect(screen.getByRole('dialog', { name: 'Add account' })).toBeInTheDocument()
    expect(screen.getAllByTestId('account-card')).toHaveLength(5)
    expect(router.state.location.pathname).toBe('/balances')
  })

  it('shows the empty line and the Add Accounts card, without Edit Accounts, when there are no accounts', async () => {
    renderPage(() => Promise.resolve([]))
    const empty = await screen.findByText('No accounts yet.')
    expect(screen.queryByTestId('account-card')).not.toBeInTheDocument()
    const card = screen.getByTestId('add-accounts-card')
    expect(empty.compareDocumentPosition(card) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(within(card).getByRole('button', { name: 'Add Accounts' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Edit Accounts' })).not.toBeInTheDocument()
  })

  it('shows the error with Retry, and recovers on retry', async () => {
    let fail = true
    renderPage(() =>
      fail ? Promise.reject(new ApiError('UNKNOWN', 'Could not load accounts.')) : loaded(),
    )
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load accounts.')
    fail = false
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    await waitFor(() => expect(screen.getAllByTestId('account-card')).toHaveLength(5))
  })

  describe('removing an account', () => {
    it('opens a dialog that names the account', async () => {
      renderPage(loaded)
      const { dialog } = await openRemove('Checking')
      expect(
        within(dialog).getByText('Your Checking account at AB Bank Ltd. (693 456 699****) will be removed.'),
      ).toBeInTheDocument()
      expect(within(dialog).getByRole('button', { name: 'Remove' })).toBeInTheDocument()
      expect(within(dialog).getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
      expect(within(dialog).queryByRole('alert')).not.toBeInTheDocument()
    })

    it.each([
      ['Cancel', () => fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))],
      ['Esc', () => fireEvent.keyDown(document.body, { key: 'Escape' })],
      ['the X', () => fireEvent.click(screen.getByRole('button', { name: 'Close' }))],
    ])('changes nothing on %s and returns focus to Remove', async (_name, close) => {
      const api = statefulApi()
      renderPage(api.listAccounts, api.removeAccount)
      const { remove } = await openRemove('Checking')
      close()
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(api.removeAccount).not.toHaveBeenCalled()
      expect(screen.getAllByTestId('account-card')).toHaveLength(5)
      expect(remove).toHaveFocus()
    })

    it('removes the card on confirm, closes the dialog and focuses the page title', async () => {
      const api = statefulApi()
      renderPage(api.listAccounts, api.removeAccount)
      const { dialog } = await openRemove('Checking')
      fireEvent.click(within(dialog).getByRole('button', { name: 'Remove' }))
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
      expect(api.removeAccount).toHaveBeenCalledTimes(1)
      expect(api.removeAccount).toHaveBeenCalledWith('acc_2')
      expect(screen.queryByRole('article', { name: 'Checking' })).not.toBeInTheDocument()
      expect(screen.getAllByTestId('account-card')).toHaveLength(4)
      expect(screen.getByRole('heading', { level: 1, name: 'Balances' })).toHaveFocus()
    })

    it('disables both buttons and ignores Esc and a second Remove while the removal is pending', async () => {
      const api = statefulApi()
      let finish: () => void = () => {}
      const removeAccount = vi.fn(
        (id: string) =>
          new Promise<void>((resolve) => {
            finish = () => {
              void api.removeAccount(id).then(resolve)
            }
          }),
      )
      renderPage(api.listAccounts, removeAccount)
      const { dialog } = await openRemove('Checking')
      const remove = within(dialog).getByRole('button', { name: 'Remove' })
      fireEvent.click(remove)
      await waitFor(() => expect(remove).toBeDisabled())
      expect(within(dialog).getByRole('button', { name: 'Cancel' })).toBeDisabled()
      fireEvent.keyDown(document.body, { key: 'Escape' })
      fireEvent.click(remove)
      expect(screen.getByRole('dialog', { name: 'Remove account?' })).toBeInTheDocument()
      expect(removeAccount).toHaveBeenCalledTimes(1)

      finish()
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
      expect(screen.queryByRole('article', { name: 'Checking' })).not.toBeInTheDocument()
      expect(screen.getAllByTestId('account-card')).toHaveLength(4)
    })

    it('sends one removal for a double click on Remove', async () => {
      const api = statefulApi()
      let finish: () => void = () => {}
      const removeAccount = vi.fn(
        (id: string) =>
          new Promise<void>((resolve) => {
            finish = () => {
              void api.removeAccount(id).then(resolve)
            }
          }),
      )
      renderPage(api.listAccounts, removeAccount)
      const { dialog } = await openRemove('Checking')
      const remove = within(dialog).getByRole('button', { name: 'Remove' })
      fireEvent.click(remove)
      fireEvent.click(remove)
      await waitFor(() => expect(remove).toBeDisabled())
      expect(removeAccount).toHaveBeenCalledTimes(1)

      finish()
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
      expect(screen.getAllByTestId('account-card')).toHaveLength(4)
      expect(removeAccount).toHaveBeenCalledTimes(1)
    })

    it('keeps the dialog open with an alert on failure, clears it on reopen, and retries', async () => {
      const api = statefulApi()
      api.control.fail = new ApiError('STORAGE_FULL', 'Your browser storage is full. Free some space and try again.')
      renderPage(api.listAccounts, api.removeAccount)
      const { dialog } = await openRemove('Checking')
      fireEvent.click(within(dialog).getByRole('button', { name: 'Remove' }))
      expect(await within(dialog).findByRole('alert')).toHaveTextContent('Your browser storage is full.')
      expect(screen.getByRole('dialog', { name: 'Remove account?' })).toBeInTheDocument()
      expect(screen.getAllByTestId('account-card')).toHaveLength(5)

      // Reopening starts clean.
      fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))
      const reopened = (await openRemove('Checking')).dialog
      expect(within(reopened).queryByRole('alert')).not.toBeInTheDocument()

      // Fails again, then a retry from the same dialog succeeds.
      fireEvent.click(within(reopened).getByRole('button', { name: 'Remove' }))
      expect(await within(reopened).findByRole('alert')).toBeInTheDocument()
      api.control.fail = null
      fireEvent.click(within(reopened).getByRole('button', { name: 'Remove' }))
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
      expect(screen.getAllByTestId('account-card')).toHaveLength(4)
    })

    it('shows the empty line after removing the last account', async () => {
      const api = statefulApi()
      renderPage(api.listAccounts, api.removeAccount)
      for (const name of ['Credit Card', 'Checking', 'Savings', 'Investment', 'Loan']) {
        const { dialog } = await openRemove(name)
        fireEvent.click(within(dialog).getByRole('button', { name: 'Remove' }))
        await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
      }
      expect(await screen.findByText('No accounts yet.')).toBeInTheDocument()
    })
  })
})

describe('AccountCard carousel variant', () => {
  function renderSlide(account: Account) {
    const router = createMemoryRouter(
      [
        { path: '/', element: <AccountCard variant="carousel" account={account} detailsHref={detailsPath(account.id)} /> },
        { path: '/details/:id', element: <p>details page</p> },
      ],
      { initialEntries: ['/'] },
    )
    render(<RouterProvider router={router} />)
    return { router }
  }

  it('renders the teal slide: type, tail4 number, whole balance, logo and the details link', async () => {
    const { router } = renderSlide(accounts[0]!)
    const slide = screen.getByRole('article', { name: 'Credit Card' })
    expect(slide).toHaveClass('bg-primary', 'text-white')
    expect(within(slide).getByText('Account Type')).toHaveClass('text-on-dark-muted')
    expect(within(slide).getByRole('heading', { name: 'Credit Card' })).toHaveClass('font-bold')
    expect(within(slide).getByText('**** **** **** 2598')).toBeInTheDocument()
    expect(within(slide).getByText('$12,000')).toHaveClass('font-bold')
    expect(within(slide).getByRole('img', { name: 'Mastercard' })).toBeInTheDocument()
    expect(within(slide).queryByRole('button')).not.toBeInTheDocument()
    expect(within(slide).queryByText('Account Number')).not.toBeInTheDocument()
    const open = within(slide).getByRole('link', { name: 'Open Credit Card account details' })
    expect(open).toHaveAttribute('href', '/details/acc_1')
    expect(open).toHaveClass('rounded-full', 'bg-white')
    expect(open.querySelector('[data-icon="arrowUpRight"]')).not.toBeNull()
    fireEvent.click(open)
    expect(await screen.findByText('details page')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/details/acc_1')
  })

  it('shows the neutral on-dark card icon for an Other network, and never a brand logo', () => {
    renderSlide({ ...accounts[0]!, network: 'other' })
    const slide = screen.getByRole('article', { name: 'Credit Card' })
    const icon = within(slide).getByRole('img', { name: 'Other card network' })
    expect(icon).toHaveClass('text-on-dark')
    expect(icon).toHaveAttribute('height', '24')
    expect(within(slide).queryByRole('img', { name: /VISA|Mastercard/ })).not.toBeInTheDocument()
  })

  it('omits the logo for an account without a network', () => {
    renderSlide(accounts[2]!)
    const slide = screen.getByRole('article', { name: 'Savings' })
    expect(within(slide).queryByRole('img')).not.toBeInTheDocument()
    expect(within(slide).getByText('**** **** **** 1234')).toBeInTheDocument()
    expect(within(slide).getByText('$180,000')).toBeInTheDocument()
  })
})

describe('AccountCard network mark', () => {
  function renderCard(account: Account) {
    const router = createMemoryRouter([{ path: '/', element: <AccountCard account={account} detailsHref="/x" /> }])
    render(<RouterProvider router={router} />)
    return screen.getByTestId('account-card')
  }

  it.each([
    ['Credit Card', 'visa', 'VISA'],
    ['Checking', 'mastercard', 'Mastercard'],
  ] as const)('shows the brand logo on a %s with that network', (_name, network, alt) => {
    const card = renderCard({ ...accounts[1]!, network })
    expect(within(card).getByRole('img', { name: alt })).toBeInTheDocument()
    expect(within(card).getAllByRole('img')).toHaveLength(1)
  })

  it.each([
    ['Other', 'other'],
    ['an unknown network', 'amex'],
    ['no network', undefined],
  ])('shows the neutral subtle card icon for a card with %s', (_name, network) => {
    const card = renderCard({ ...accounts[0]!, network: network as Account['network'] })
    const icon = within(card).getByRole('img', { name: 'Other card network' })
    expect(icon).toHaveClass('text-subtle')
    expect(icon).toHaveAttribute('width', '24')
    expect(within(card).getAllByRole('img')).toHaveLength(1)
  })

  it.each(['savings', 'investment', 'loan'] as const)('shows nothing on %s, even with a stored network', (type) => {
    const card = renderCard({ ...accounts[2]!, type, network: 'visa' })
    expect(within(card).queryByRole('img')).not.toBeInTheDocument()
  })

  it('wraps a long bank name instead of overflowing', () => {
    const card = renderCard({ ...accounts[1]!, bankName: 'B'.repeat(60) })
    expect(within(card).getByText('B'.repeat(60))).toHaveClass('break-words', 'min-w-0')
  })
})
