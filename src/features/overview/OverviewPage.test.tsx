import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it } from 'vitest'
import { ApiProvider } from '../../api/ApiProvider.tsx'
import type { FinbankApi } from '../../api/port.ts'
import { qk } from '../../api/queryKeys.ts'
import { ApiError, type Account } from '../../api/types.ts'
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

const detailsPath = (id: string) => `/details/${id}`

function renderPage(api: Pick<FinbankApi, 'listAccounts' | 'getBalanceSummary'>) {
  const router = createMemoryRouter(
    [
      { path: '/', element: <OverviewPage accountDetailsPath={detailsPath} /> },
      { path: '/details/:id', element: <p>details page</p> },
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
  return { router, queryClient }
}

const seededApi = (list: Account[] = accounts, totalBalanceCents = fixtureTotalCents) => ({
  listAccounts: () => Promise.resolve(structuredClone(list)),
  getBalanceSummary: () => Promise.resolve({ totalBalanceCents }),
})

const card = () => screen.getByRole('region', { name: 'Total Balance' })
const carousel = () => screen.getByRole('region', { name: 'Accounts' })
const slide = () => within(carousel()).getByRole('group')
const dots = () => within(carousel()).getAllByRole('button', { name: /^Show slide/ })
const next = () => within(carousel()).getByRole('button', { name: 'Next' })
const prev = () => within(carousel()).getByRole('button', { name: 'Previous' })

describe('OverviewPage', () => {
  it('has a visually hidden h1 and only the Total Balance card in the grid', async () => {
    renderPage(seededApi())
    expect(screen.getByRole('heading', { level: 1, name: 'Overview' })).toHaveClass('sr-only')
    expect(screen.getByTestId('overview-grid')).toHaveClass('grid-cols-3')
    await screen.findByRole('region', { name: 'Accounts' })
    expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual(['Total Balance'])
  })

  it('shows skeletons while loading', () => {
    renderPage({ listAccounts: () => new Promise(() => {}), getBalanceSummary: () => new Promise(() => {}) })
    expect(within(card()).getAllByTestId('skeleton')).toHaveLength(2)
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
})
