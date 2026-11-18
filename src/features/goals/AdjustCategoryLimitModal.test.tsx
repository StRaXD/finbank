import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ApiProvider } from '../../api/ApiProvider.tsx'
import type { FinbankApi } from '../../api/port.ts'
import { ApiError, type CategoryLimit, type ExpenseCategoryId, type IsoDate, type YearMonth } from '../../api/types.ts'
import { GoalsPage } from './GoalsPage.tsx'

function createFakeApi(overrides: Partial<FinbankApi> = {}) {
  const store: CategoryLimit[] = [
    { category: 'housing', limitCents: 100_000 },
    { category: 'food', limitCents: 50_000 },
    { category: 'transportation', limitCents: 30_000 },
    { category: 'entertainment', limitCents: 25_000 },
    { category: 'shopping', limitCents: 40_000 },
    { category: 'others', limitCents: 20_000 },
  ]
  const write = (category: ExpenseCategoryId, limitCents: number) => {
    const index = store.findIndex((limit) => limit.category === category)
    store[index] = { category, limitCents }
    return Promise.resolve(structuredClone(store[index]!))
  }
  const updateCategoryLimit = vi.fn<FinbankApi['updateCategoryLimit']>(write)
  const api = {
    getToday: () => Promise.resolve('2023-05-19' as IsoDate),
    getSavingsGoal: (month: YearMonth) => Promise.resolve({ month, targetCents: 2_000_000, achievedCents: 1_250_000 }),
    getSavingSummary: () => Promise.resolve([]),
    listCategoryLimits: () => Promise.resolve(structuredClone(store)),
    updateCategoryLimit,
    ...overrides,
  } as FinbankApi
  return { api, store, write, updateCategoryLimit }
}

function renderPage(api: FinbankApi) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <ApiProvider api={api}>
      <QueryClientProvider client={queryClient}>
        <GoalsPage />
      </QueryClientProvider>
    </ApiProvider>,
  )
}

const card = (name: string) => screen.getByRole('article', { name })
const limitText = (name: string) => within(card(name)).getByText(/^\$/).textContent
const adjustButton = (name: string) => screen.getByRole('button', { name: `Adjust ${name} limit` })

async function openModal(name = 'Food') {
  await waitFor(() => expect(screen.getAllByTestId('category-limit-card')).toHaveLength(6))
  fireEvent.click(adjustButton(name))
  return screen.getByRole('dialog', { name: `Adjust ${name} limit` })
}

const target = () => screen.getByLabelText('Target Amounts')
const type = (input: HTMLElement, value: string) => fireEvent.change(input, { target: { value } })
const save = () => fireEvent.click(screen.getByRole('button', { name: 'Save' }))
const dialogClosed = () => waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
const allLimits = () =>
  ['Housing', 'Food', 'Transportation', 'Entertainment', 'Shopping', 'Others'].map((name) => limitText(name))

describe('AdjustCategoryLimitModal', () => {
  it('opens "Adjust Food limit" with one prefilled Target Amounts field, an X and Save, and no visible title', async () => {
    renderPage(createFakeApi().api)
    const dialog = await openModal('Food')
    expect(within(dialog).getAllByRole('textbox')).toHaveLength(1)
    expect(target()).toHaveValue('$500.00')
    expect(target()).toHaveAttribute('inputmode', 'decimal')
    expect(target()).toHaveClass('h-14')
    expect(within(dialog).getByRole('button', { name: 'Save' }).parentElement).toHaveClass('w-48')
    expect(within(dialog).getByRole('button', { name: 'Close' })).toBeInTheDocument()
    expect(within(dialog).queryByRole('heading')).not.toBeInTheDocument()
  })

  it('names each dialog after its category', async () => {
    renderPage(createFakeApi().api)
    await openModal('Housing')
    expect(target()).toHaveValue('$1,000.00')
  })

  it('saves only that category, closes, and the Food card already shows the new limit', async () => {
    const { api, updateCategoryLimit } = createFakeApi()
    renderPage(api)
    await openModal('Food')
    type(target(), '$650')
    save()
    await dialogClosed()
    expect(updateCategoryLimit).toHaveBeenCalledTimes(1)
    expect(updateCategoryLimit).toHaveBeenCalledWith('food', 65_000)
    // No waiting: the refetch settled before the modal closed.
    expect(allLimits()).toEqual(['$1,000.00', '$650.00', '$300.00', '$250.00', '$400.00', '$200.00'])
  })

  it('shows "Saving…" on a disabled Save while the save is pending', async () => {
    let resolve!: (limit: CategoryLimit) => void
    const { api } = createFakeApi({
      updateCategoryLimit: () =>
        new Promise<CategoryLimit>((r) => {
          resolve = r
        }),
    })
    renderPage(api)
    await openModal()
    save()
    expect(await screen.findByRole('button', { name: 'Saving…' })).toHaveAttribute('aria-disabled', 'true')
    resolve({ category: 'food', limitCents: 50_000 })
    await dialogClosed()
  })

  it.each([
    ['the X', () => fireEvent.click(screen.getByRole('button', { name: 'Close' }))],
    ['Esc', () => fireEvent.keyDown(document, { key: 'Escape' })],
    [
      'an overlay click',
      () => {
        const layer = screen.getByTestId('modal-overlay')
        fireEvent.mouseDown(layer)
        fireEvent.click(layer)
      },
    ],
  ])('ignores %s while a save is pending, then shows a rejection', async (_name, close) => {
    let reject!: (error: unknown) => void
    const { api } = createFakeApi({
      updateCategoryLimit: () =>
        new Promise<CategoryLimit>((_resolve, r) => {
          reject = r
        }),
    })
    renderPage(api)
    await openModal()
    save()
    await screen.findByRole('button', { name: 'Saving…' })
    close()
    expect(screen.getByRole('dialog', { name: 'Adjust Food limit' })).toBeInTheDocument()
    reject(new ApiError('STORAGE_FULL', 'Your browser storage is full.'))
    expect(await screen.findByRole('alert')).toHaveTextContent('Your browser storage is full.')
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('calls updateCategoryLimit once for two quick Save clicks', async () => {
    const { api, updateCategoryLimit } = createFakeApi()
    renderPage(api)
    await openModal()
    save()
    save()
    await dialogClosed()
    expect(updateCategoryLimit).toHaveBeenCalledTimes(1)
  })

  it.each([
    ['', 'Enter an amount, like 1,234.50.'],
    ['abc', 'Enter an amount, like 1,234.50.'],
    ['1.234', 'Enter an amount, like 1,234.50.'],
    ['-5', "Amount can't be negative."],
  ])('blocks Save for %j with an inline error and no call', async (value, message) => {
    const { api, updateCategoryLimit } = createFakeApi()
    renderPage(api)
    await openModal()
    type(target(), value)
    save()
    await waitFor(() => expect(target()).toHaveAttribute('aria-invalid', 'true'))
    expect(screen.getByText(message)).toHaveClass('text-danger')
    expect(updateCategoryLimit).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(target()).toHaveValue(value)
  })

  it('saves after a validation error once the amount is corrected', async () => {
    const { api, updateCategoryLimit } = createFakeApi()
    renderPage(api)
    await openModal()
    type(target(), 'abc')
    save()
    await waitFor(() => expect(target()).toHaveAttribute('aria-invalid', 'true'))
    type(target(), '650')
    save()
    await dialogClosed()
    expect(updateCategoryLimit).toHaveBeenCalledTimes(1)
    expect(updateCategoryLimit).toHaveBeenCalledWith('food', 65_000)
  })

  it.each([
    ['the X', () => fireEvent.click(screen.getByRole('button', { name: 'Close' }))],
    ['Esc', () => fireEvent.keyDown(document, { key: 'Escape' })],
    [
      'an overlay click',
      () => {
        const layer = screen.getByTestId('modal-overlay')
        fireEvent.mouseDown(layer)
        fireEvent.click(layer)
      },
    ],
  ])('discards edits when closed with %s, and reopens with the stored limit', async (_name, close) => {
    const { api, updateCategoryLimit } = createFakeApi()
    renderPage(api)
    await openModal()
    type(target(), '99')
    close()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(updateCategoryLimit).not.toHaveBeenCalled()
    fireEvent.click(adjustButton('Food'))
    expect(target()).toHaveValue('$500.00')
    expect(limitText('Food')).toBe('$500.00')
  })

  it('puts an adapter limitCents error on the input and keeps the edit', async () => {
    const reject = vi
      .fn<FinbankApi['updateCategoryLimit']>()
      .mockRejectedValueOnce(
        new ApiError('VALIDATION', 'Please correct the highlighted fields.', { limitCents: 'Limit is too large.' }),
      )
    renderPage(createFakeApi({ updateCategoryLimit: reject }).api)
    await openModal()
    type(target(), '123')
    save()
    expect(await screen.findByText('Limit is too large.')).toBeInTheDocument()
    expect(target()).toHaveAttribute('aria-invalid', 'true')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(target()).toHaveValue('123')
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('shows any other adapter error as one alert above Save, and Save works again', async () => {
    const { api, write } = createFakeApi()
    const update = vi
      .fn<FinbankApi['updateCategoryLimit']>()
      .mockRejectedValueOnce(new ApiError('STORAGE_FULL', 'Your browser storage is full.'))
      .mockImplementation(write)
    renderPage({ ...api, updateCategoryLimit: update })
    await openModal()
    type(target(), '720')
    save()
    expect(await screen.findByRole('alert')).toHaveTextContent('Your browser storage is full.')
    expect(screen.getAllByRole('alert')).toHaveLength(1)
    expect(target()).toHaveValue('720')
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled()
    save()
    await dialogClosed()
    expect(limitText('Food')).toBe('$720.00')
  })
})
