import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { ApiProvider } from '../../api/ApiProvider.tsx'
import type { FinbankApi } from '../../api/port.ts'
import { type Account, type AccountInput, ApiError } from '../../api/types.ts'
import { BalancesPage } from './BalancesPage.tsx'

const seeded: Account[] = [
  {
    id: 'acc_1',
    type: 'creditCard',
    bankName: 'AB Bank Ltd.',
    branchName: 'Gulshan Avenue Branch',
    network: 'mastercard',
    accountNumber: '3388455688602598',
    balanceCents: 1_200_000,
  },
  {
    id: 'acc_2',
    type: 'savings',
    bankName: 'Brac Bank Ltd.',
    branchName: 'Banani Branch',
    accountNumber: '13345688681234',
    balanceCents: 18_000_000,
  },
]

/** A stateful hand-built adapter: `createAccount` appends; `control.fail` makes it reject; `control.hold` keeps it pending. */
function fakeApi(initial: Account[] = seeded) {
  let list = structuredClone(initial)
  let next = 6
  const control = {
    fail: null as ApiError | null,
    hold: null as null | { release: () => void },
  }
  const createAccount = vi.fn((input: AccountInput) => {
    if (control.fail) return Promise.reject(control.fail)
    const account = { id: `acc_${next++}`, ...input }
    const commit = () => {
      list = [...list, account]
      return structuredClone(account)
    }
    if (control.hold === null) return Promise.resolve(commit())
    return new Promise<Account>((resolve) => {
      control.hold = { release: () => resolve(commit()) }
    })
  })
  const api = {
    listAccounts: () => Promise.resolve(structuredClone(list)),
    removeAccount: () => Promise.resolve(),
    createAccount,
  } as unknown as FinbankApi
  return { api, createAccount, control }
}

function renderPage(api: FinbankApi) {
  const router = createMemoryRouter([{ path: '/balances', element: <BalancesPage accountDetailsPath={(id) => `/d/${id}`} /> }], {
    initialEntries: ['/balances'],
  })
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <ApiProvider api={api}>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </ApiProvider>,
  )
}

async function openModal() {
  const add = await screen.findByRole('button', { name: 'Add Accounts' })
  add.focus()
  fireEvent.click(add)
  return screen.getByRole('dialog', { name: 'Add account' })
}

const combo = (name: string) => screen.getByRole('combobox', { name })
const choose = (name: string, option: string) => {
  fireEvent.click(combo(name))
  fireEvent.click(screen.getByRole('option', { name: option }))
}
const type = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } })
const save = () => fireEvent.click(screen.getByRole('button', { name: /^(Save|Saving…)$/ }))
const dialogClosed = () => waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
const errorOf = (control: HTMLElement) => control.getAttribute('aria-describedby') && document.getElementById(control.getAttribute('aria-describedby')!.split(' ').at(-1)!)?.textContent

function fillChecking() {
  choose('Account Type', 'Checking')
  type('Bank Name', ' City Bank ')
  type('Branch Name', 'Main')
  choose('Card Network', 'Visa')
  type('Account Number', '1234 5678-9012')
  type('Balance', '$1,500.00')
}

describe('AccountFormModal', () => {
  it('opens tall, unnamed but labelled "Add account", with 56px fields, the X and a 192px Save', async () => {
    renderPage(fakeApi().api)
    const dialog = await openModal()
    expect(screen.getByTestId('modal-overlay')).toHaveClass('pt-30')
    expect(dialog).toHaveClass('w-122')
    expect(within(dialog).queryByRole('heading')).not.toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Close' })).toBeInTheDocument()
    expect(combo('Account Type')).toHaveTextContent('Select type…')
    // As in every Modal, focus starts on the first focusable: the X.
    expect(within(dialog).getByRole('button', { name: 'Close' })).toHaveFocus()
    expect(within(combo('Account Type')).getByText('Select type…')).toHaveClass('text-subtle')
    // Card Network appears only once a card type is chosen.
    expect(screen.queryByRole('combobox', { name: 'Card Network' })).not.toBeInTheDocument()
    for (const label of ['Bank Name', 'Branch Name', 'Account Number', 'Balance']) {
      expect(screen.getByLabelText(label)).toHaveClass('h-14')
    }
    expect(combo('Account Type')).toHaveClass('h-14')
    // Every field is required, and says so to assistive tech (no maxLength: the 61-character error must show).
    expect(combo('Account Type')).toHaveAttribute('aria-required', 'true')
    for (const label of ['Bank Name', 'Branch Name', 'Account Number', 'Balance']) {
      expect(screen.getByLabelText(label)).toHaveAttribute('aria-required', 'true')
      expect(screen.getByLabelText(label)).not.toHaveAttribute('maxlength')
    }
    choose('Account Type', 'Checking')
    expect(combo('Card Network')).toHaveAttribute('aria-required', 'true')
    const button = within(dialog).getByRole('button', { name: 'Save' })
    expect(button.parentElement).toHaveClass('w-48')
  })

  it('adds a Checking account: normalised input, closes after the refetch, the card is last, focus on Add Accounts', async () => {
    const { api, createAccount } = fakeApi()
    renderPage(api)
    await openModal()
    fillChecking()
    save()
    await dialogClosed()
    expect(createAccount).toHaveBeenCalledExactlyOnceWith({
      type: 'checking',
      bankName: 'City Bank',
      branchName: 'Main',
      network: 'visa',
      accountNumber: '123456789012',
      balanceCents: 150_000,
    })
    const cards = screen.getAllByTestId('account-card')
    expect(cards).toHaveLength(3)
    expect(within(cards[2]!).getByRole('heading', { name: 'Checking' })).toBeInTheDocument()
    expect(within(cards[2]!).getByRole('img', { name: 'VISA' })).toBeInTheDocument()
    expect(cards[2]!.nextElementSibling).toBe(screen.getByTestId('add-accounts-card'))
    expect(screen.getByRole('button', { name: 'Add Accounts' })).toHaveFocus()
  })

  it('shows Card Network only for cards, clears it on a non-card type, and keeps the balance through label changes', async () => {
    const { api, createAccount } = fakeApi()
    renderPage(api)
    await openModal()
    choose('Account Type', 'Credit Card')
    expect(screen.getByLabelText('Amount owed')).toBeInTheDocument()
    choose('Account Type', 'Checking')
    choose('Card Network', 'Visa')
    type('Balance', '12.50')
    choose('Account Type', 'Savings')
    expect(screen.queryByRole('combobox', { name: 'Card Network' })).not.toBeInTheDocument()
    expect(screen.getByLabelText('Balance')).toHaveValue('12.50')
    choose('Account Type', 'Checking')
    expect(combo('Card Network')).toHaveTextContent('Select network…')
    fireEvent.click(combo('Card Network'))
    for (const option of screen.getAllByRole('option')) expect(option).toHaveAttribute('aria-selected', 'false')
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual(['Visa', 'Mastercard', 'Other'])
    fireEvent.keyDown(screen.getByRole('listbox'), { key: 'Escape' })
    choose('Account Type', 'Loan')
    expect(screen.getByLabelText('Amount owed')).toHaveValue('12.50')
    type('Bank Name', 'B')
    type('Branch Name', 'C')
    type('Account Number', '12345678')
    save()
    await dialogClosed()
    expect(createAccount.mock.calls[0]![0]).toEqual({
      type: 'loan',
      bankName: 'B',
      branchName: 'C',
      accountNumber: '12345678',
      balanceCents: 1_250,
    })
  })

  it('shows every message on an empty Save and focuses Account Type', async () => {
    const { api, createAccount } = fakeApi()
    renderPage(api)
    await openModal()
    screen.getByRole('button', { name: 'Save' }).focus()
    save()
    expect(await screen.findByText('Choose an account type.')).toBeInTheDocument()
    expect(combo('Account Type')).toHaveAttribute('aria-invalid', 'true')
    expect(combo('Account Type')).toHaveAccessibleDescription('Choose an account type.')
    await waitFor(() => expect(combo('Account Type')).toHaveFocus())
    expect(screen.getByText('Enter the bank name.')).toBeInTheDocument()
    expect(screen.getByText('Enter the branch name.')).toBeInTheDocument()
    expect(screen.getByText('Enter the account number.')).toBeInTheDocument()
    expect(screen.getByText('Enter an amount, like 1,234.50.')).toBeInTheDocument()
    expect(createAccount).not.toHaveBeenCalled()
  })

  it('focuses Card Network when it is the first invalid field', async () => {
    renderPage(fakeApi().api)
    await openModal()
    fillChecking()
    // Via Savings, which clears the network.
    choose('Account Type', 'Savings')
    choose('Account Type', 'Credit Card')
    type('Account Number', '1234')
    save()
    expect(await screen.findByText('Choose a card network.')).toBeInTheDocument()
    expect(screen.getByText('Enter 8–19 digits.')).toBeInTheDocument()
    await waitFor(() => expect(combo('Card Network')).toHaveFocus())
  })

  it.each([
    ['Bank Name', '   ', 'Enter the bank name.'],
    ['Branch Name', ' ', 'Enter the branch name.'],
    ['Account Number', ' - ', 'Enter the account number.'],
    ['Account Number', '1234 567', 'Enter 8–19 digits.'],
    ['Account Number', '12a45678', 'Enter 8–19 digits.'],
    ['Account Number', '1'.repeat(20), 'Enter 8–19 digits.'],
    ['Bank Name', 'B'.repeat(61), 'Use 60 characters or fewer.'],
    ['Branch Name', 'B'.repeat(61), 'Use 60 characters or fewer.'],
    ['Balance', '', 'Enter an amount, like 1,234.50.'],
    ['Balance', 'abc', 'Enter an amount, like 1,234.50.'],
    ['Balance', '-5', "Amount can't be negative."],
  ])('rejects %s "%s" with "%s" and focuses it', async (label, value, message) => {
    const { api, createAccount } = fakeApi()
    renderPage(api)
    await openModal()
    fillChecking()
    type(label, value)
    save()
    await waitFor(() => expect(errorOf(screen.getByLabelText(label))).toBe(message))
    expect(screen.getByLabelText(label)).toHaveAttribute('aria-invalid', 'true')
    await waitFor(() => expect(screen.getByLabelText(label)).toHaveFocus())
    expect(createAccount).not.toHaveBeenCalled()
  })

  it('accepts a 60-character bank name', async () => {
    const { api, createAccount } = fakeApi()
    renderPage(api)
    await openModal()
    fillChecking()
    type('Bank Name', 'B'.repeat(60))
    save()
    await dialogClosed()
    expect(createAccount.mock.calls[0]![0].bankName).toBe('B'.repeat(60))
  })

  it("puts the adapter's duplicate-number error on Account Number and focuses it", async () => {
    const { api, control } = fakeApi()
    control.fail = new ApiError('VALIDATION', 'Please correct the highlighted fields.', {
      accountNumber: 'An account with this number already exists.',
    })
    renderPage(api)
    await openModal()
    fillChecking()
    type('Account Number', '3388 4556 8860 2598')
    save()
    await waitFor(() => expect(errorOf(screen.getByLabelText('Account Number'))).toBe('An account with this number already exists.'))
    expect(screen.getByLabelText('Account Number')).toHaveFocus()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('shows a full store as an alert, keeps the modal open with its values, and adds nothing', async () => {
    const { api, control } = fakeApi()
    control.fail = new ApiError('STORAGE_FULL', 'Your browser storage is full. Free some space and try again.')
    renderPage(api)
    await openModal()
    fillChecking()
    save()
    expect(await screen.findByRole('alert')).toHaveTextContent('Your browser storage is full.')
    expect(screen.getByRole('dialog', { name: 'Add account' })).toBeInTheDocument()
    expect(screen.getByLabelText('Bank Name')).toHaveValue(' City Bank ')
    expect(combo('Card Network')).toHaveTextContent('Visa')
    expect(screen.getAllByTestId('account-card')).toHaveLength(2)
  })

  it('keeps focus on an aria-disabled "Saving…", ignores X, Esc, overlay and a second Save, then closes', async () => {
    const { api, createAccount, control } = fakeApi()
    control.hold = { release: () => {} }
    renderPage(api)
    await openModal()
    fillChecking()
    screen.getByRole('button', { name: 'Save' }).focus()
    save()
    const busy = await screen.findByRole('button', { name: 'Saving…' })
    expect(busy).toHaveAttribute('aria-disabled', 'true')
    expect(busy).toHaveFocus()
    save()
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    fireEvent.keyDown(document, { key: 'Escape' })
    const layer = screen.getByTestId('modal-overlay')
    fireEvent.mouseDown(layer)
    fireEvent.click(layer)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(createAccount).toHaveBeenCalledTimes(1)
    control.hold.release()
    await dialogClosed()
    expect(screen.getAllByTestId('account-card')).toHaveLength(3)
  })

  it.each([
    ['the X', () => fireEvent.click(screen.getByRole('button', { name: 'Close' }))],
    ['Esc', () => fireEvent.keyDown(document, { key: 'Escape' })],
  ])('discards the form on %s and starts empty next time', async (_name, close) => {
    const { api, createAccount } = fakeApi()
    renderPage(api)
    await openModal()
    fillChecking()
    close()
    await dialogClosed()
    expect(screen.getByRole('button', { name: 'Add Accounts' })).toHaveFocus()
    await openModal()
    expect(combo('Account Type')).toHaveTextContent('Select type…')
    expect(screen.getByLabelText('Bank Name')).toHaveValue('')
    expect(createAccount).not.toHaveBeenCalled()
  })

  it('closes only the open list on Esc', async () => {
    renderPage(fakeApi().api)
    await openModal()
    fireEvent.click(combo('Account Type'))
    fireEvent.keyDown(screen.getByRole('listbox'), { key: 'Escape' })
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: 'Add account' })).toBeInTheDocument()
    expect(combo('Account Type')).toHaveFocus()
  })

  it('picks options with the keyboard', async () => {
    renderPage(fakeApi().api)
    await openModal()
    fireEvent.keyDown(combo('Account Type'), { key: 'ArrowDown' })
    const listbox = screen.getByRole('listbox', { name: 'Account Type' })
    expect(listbox).toHaveFocus()
    fireEvent.keyDown(listbox, { key: 'ArrowDown' })
    fireEvent.keyDown(listbox, { key: 'Enter' })
    expect(combo('Account Type')).toHaveTextContent('Checking')
    expect(combo('Account Type')).toHaveFocus()
    fireEvent.keyDown(combo('Card Network'), { key: 'ArrowDown' })
    fireEvent.keyDown(screen.getByRole('listbox', { name: 'Card Network' }), { key: 'End' })
    fireEvent.keyDown(screen.getByRole('listbox', { name: 'Card Network' }), { key: ' ' })
    expect(combo('Card Network')).toHaveTextContent('Other')
  })

  it('turns the empty state into the grid on the first add, keeping the modal and then focusing Add Accounts', async () => {
    renderPage(fakeApi([]).api)
    expect(await screen.findByText('No accounts yet.')).toBeInTheDocument()
    await openModal()
    fillChecking()
    save()
    await dialogClosed()
    expect(screen.queryByText('No accounts yet.')).not.toBeInTheDocument()
    expect(screen.getAllByTestId('account-card')).toHaveLength(1)
    expect(screen.getByRole('button', { name: 'Edit Accounts' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add Accounts' })).toHaveFocus()
  })
})
