// Full-app Add Account flow over one shared mock storage (localStorage / sessionStorage): a new
// account shows on Balances, in the Overview carousel and total, and on Account Details without a
// reload; Transactions, Expenses and the Overview Statistics stay as they were; and everything
// survives a reload and a logout followed by a login.
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { MOCK_STORAGE_KEY } from '../api/mock/mockApi.ts'
import { seed } from '../api/mock/seed.ts'
import { routes } from './routes.ts'
import { createTestApi, renderAt } from './test-utils.tsx'

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
})

async function signIn() {
  const api = createTestApi()
  await api.login({ email: seed.profile.email, password: 'secret', persistent: true })
  return api
}

const combo = (name: string) => screen.getByRole('combobox', { name })
const choose = (name: string, option: string) => {
  fireEvent.click(combo(name))
  fireEvent.click(screen.getByRole('option', { name: option }))
}
const type = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } })

type NewAccount = { type: string; bank: string; branch: string; network?: string; number: string; balance: string }

const visaChecking: NewAccount = {
  type: 'Checking',
  bank: ' City Bank ',
  branch: 'Main',
  network: 'Visa',
  number: '1234 5678-9012',
  balance: '$1,500.00',
}

/** On Balances: opens the modal, fills it and saves, waiting for it to close. */
async function addAccount(account: NewAccount) {
  fireEvent.click(await screen.findByRole('button', { name: 'Add Accounts' }))
  screen.getByRole('dialog', { name: 'Add account' })
  choose('Account Type', account.type)
  type('Bank Name', account.bank)
  type('Branch Name', account.branch)
  if (account.network) choose('Card Network', account.network)
  type('Account Number', account.number)
  type(account.type === 'Loan' || account.type === 'Credit Card' ? 'Amount owed' : 'Balance', account.balance)
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
}

/** The Overview total and the carousel's last slide. */
async function overviewLast(count: number) {
  const total = await screen.findByTestId('total-balance')
  const carousel = await screen.findByRole('region', { name: 'Accounts' })
  await waitFor(() => expect(within(carousel).getAllByRole('button', { name: /^Show slide/ })).toHaveLength(count))
  fireEvent.click(within(carousel).getByRole('button', { name: `Show slide ${count} of ${count}` }))
  const slide = within(carousel).getByRole('group', { name: `${count} of ${count}` })
  return { total, slide }
}

/** Reads the screens an add must not change: Transactions rows, Expenses cards, Overview Statistics. */
async function unchangedScreens(navigate: (to: string) => Promise<void>) {
  await navigate(routes.transactions)
  const table = await screen.findByRole('table', { name: 'Transactions' })
  await waitFor(() => expect(within(table).getAllByRole('row').length).toBeGreaterThan(1))
  const rows = within(table)
    .getAllByRole('row')
    .map((row) => row.textContent)
  await navigate(routes.expenses)
  await waitFor(() => expect(screen.getAllByTestId('category-card')).toHaveLength(6))
  const expenses = screen.getAllByTestId('category-card').map((card) => card.textContent)
  await navigate(routes.overview)
  const stats = await screen.findByRole('region', { name: 'Statistics' })
  await waitFor(() => expect(stats.querySelector('[aria-busy="true"]')).toBeNull())
  return { rows, expenses, stats: stats.textContent }
}

describe('Add account flow', () => {
  it('shows a new Visa Checking on Balances, Overview and Account Details at once, leaving other screens unchanged', async () => {
    const { router } = renderAt(routes.overview, await signIn())
    const navigate = (to: string) => act(() => router.navigate(to))
    const before = await unchangedScreens(navigate)
    expect(before.rows.length).toBeGreaterThan(5)
    expect(before.expenses.join('')).toContain('$')
    expect(before.stats).not.toContain('Loading')
    expect(before.stats).toMatch(/\d/)

    await navigate(routes.balances)
    await addAccount(visaChecking)
    const cards = screen.getAllByTestId('account-card')
    expect(cards).toHaveLength(6)
    const added = cards[5]!
    expect(within(added).getByRole('heading', { name: 'Checking' })).toBeInTheDocument()
    expect(within(added).getByText('City Bank')).toBeInTheDocument()
    expect(within(added).getByText('$1,500')).toBeInTheDocument()
    expect(within(added).getByRole('img', { name: 'VISA' })).toBeInTheDocument()
    expect(added.nextElementSibling).toBe(screen.getByTestId('add-accounts-card'))
    expect(screen.getByRole('button', { name: 'Add Accounts' })).toHaveFocus()

    await navigate(routes.overview)
    const { total, slide } = await overviewLast(6)
    await waitFor(() => expect(total).toHaveTextContent('$241,899'))
    expect(within(slide).getByRole('article', { name: 'Checking' })).toBeInTheDocument()
    expect(within(slide).getByText('**** **** **** 9012')).toBeInTheDocument()
    expect(within(slide).getByRole('img', { name: 'VISA' })).toBeInTheDocument()

    await navigate(routes.accountDetails('acc_6'))
    const details = await screen.findByTestId('account-details')
    expect(within(details).getByText('City Bank')).toBeInTheDocument()
    expect(within(details).getByText('Main')).toBeInTheDocument()
    expect(within(details).getByText('$1,500.00')).toBeInTheDocument()
    expect(await screen.findByText('No transactions yet.')).toBeInTheDocument()

    expect(await unchangedScreens(navigate)).toEqual(before)
  })

  it('subtracts a Loan from the total and shows its amount owed unsigned', async () => {
    const { router } = renderAt(routes.balances, await signIn())
    await addAccount({ type: 'Loan', bank: 'Loan Bank', branch: 'North', number: '55556666', balance: '2,000' })
    expect(within(screen.getAllByTestId('account-card')[5]!).getByText('$2,000')).toBeInTheDocument()
    await act(() => router.navigate(routes.overview))
    const { total, slide } = await overviewLast(6)
    await waitFor(() => expect(total).toHaveTextContent('$238,399'))
    expect(within(slide).queryByRole('img')).not.toBeInTheDocument()
  })

  it('shows the neutral icon for an Other Credit Card in the grid and on the slide', async () => {
    const { router } = renderAt(routes.balances, await signIn())
    await addAccount({ type: 'Credit Card', bank: 'Neo Bank', branch: 'Online', network: 'Other', number: '4000 1234 5678 9010', balance: '10' })
    const card = screen.getAllByTestId('account-card')[5]!
    expect(within(card).getByRole('img', { name: 'Other card network' })).toBeInTheDocument()
    expect(within(card).queryByRole('img', { name: /VISA|Mastercard/ })).not.toBeInTheDocument()
    await act(() => router.navigate(routes.overview))
    const { slide } = await overviewLast(6)
    expect(within(slide).getByRole('img', { name: 'Other card network' })).toBeInTheDocument()
  })

  it('adds the first account from the empty state', async () => {
    const api = await signIn()
    for (const account of seed.accounts) await api.removeAccount(account.id)
    renderAt(routes.balances, api)
    expect(await screen.findByText('No accounts yet.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Edit Accounts' })).not.toBeInTheDocument()
    await addAccount(visaChecking)
    expect(screen.queryByText('No accounts yet.')).not.toBeInTheDocument()
    expect(screen.getAllByTestId('account-card')).toHaveLength(1)
    expect(screen.getByRole('button', { name: 'Edit Accounts' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add Accounts' })).toHaveFocus()
    // acc_1…acc_5 were removed, but ids are never reused.
    expect(JSON.parse(localStorage.getItem(MOCK_STORAGE_KEY)!).accounts.map((a: { id: string }) => a.id)).toEqual(['acc_6'])
  })

  it('keeps the account after a reload, and after a logout and a login', async () => {
    const { unmount } = renderAt(routes.balances, await signIn())
    await addAccount(visaChecking)
    unmount()

    // A fresh adapter and query client over the same storage: a page reload.
    const reloaded = renderAt(routes.balances, createTestApi())
    await waitFor(() => expect(screen.getAllByTestId('account-card')).toHaveLength(6))
    expect(within(screen.getAllByTestId('account-card')[5]!).getByText('City Bank')).toBeInTheDocument()
    await act(() => reloaded.router.navigate(routes.accountDetails('acc_6')))
    expect(await screen.findByText('No transactions yet.')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Logout' }))
    await screen.findByRole('heading', { level: 1, name: 'Log in' })
    fireEvent.change(screen.getByLabelText('Email Address'), { target: { value: seed.profile.email } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'secret' } })
    fireEvent.click(screen.getByRole('button', { name: 'Login' }))
    await screen.findByRole('banner')
    await act(() => reloaded.router.navigate(routes.overview))
    const { slide } = await overviewLast(6)
    expect(within(slide).getByRole('article', { name: 'Checking' })).toBeInTheDocument()
    expect(within(slide).getByText('**** **** **** 9012')).toBeInTheDocument()
  })
})
