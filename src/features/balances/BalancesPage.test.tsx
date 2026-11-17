import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it } from 'vitest'
import { ApiProvider } from '../../api/ApiProvider.tsx'
import type { FinbankApi } from '../../api/port.ts'
import { ApiError, type Account } from '../../api/types.ts'
import { BalancesPage } from './BalancesPage.tsx'

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

function renderPage(listAccounts: FinbankApi['listAccounts']) {
  const api = { listAccounts } as FinbankApi
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

  it('keeps Remove, Add Accounts and Edit Accounts inert', async () => {
    const { router } = renderPage(loaded)
    const cards = await screen.findAllByTestId('account-card')
    fireEvent.click(within(cards[0]!).getByRole('button', { name: 'Remove' }))
    fireEvent.click(screen.getByRole('button', { name: 'Add Accounts' }))
    fireEvent.click(screen.getByRole('button', { name: 'Edit Accounts' }))
    expect(screen.getAllByTestId('account-card')).toHaveLength(5)
    expect(router.state.location.pathname).toBe('/balances')
  })

  it('shows the empty line when there are no accounts', async () => {
    renderPage(() => Promise.resolve([]))
    expect(await screen.findByText('No accounts yet.')).toBeInTheDocument()
    expect(screen.queryByTestId('account-card')).not.toBeInTheDocument()
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
})
