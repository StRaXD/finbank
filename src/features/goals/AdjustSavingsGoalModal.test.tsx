import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ApiProvider } from '../../api/ApiProvider.tsx'
import type { FinbankApi } from '../../api/port.ts'
import { ApiError, type IsoDate, type SavingsGoal, type YearMonth } from '../../api/types.ts'
import { GoalsPage } from './GoalsPage.tsx'

type Store = Record<string, SavingsGoal>

function createFakeApi(overrides: Partial<FinbankApi> = {}) {
  const store: Store = {
    '2023-05': { month: '2023-05' as YearMonth, targetCents: 2_000_000, achievedCents: 1_250_000 },
  }
  const updateSavingsGoal = vi.fn<FinbankApi['updateSavingsGoal']>((month, amounts) => {
    store[month] = { month, ...amounts }
    return Promise.resolve(structuredClone(store[month]))
  })
  const api = {
    getToday: () => Promise.resolve('2023-05-19' as IsoDate),
    getSavingsGoal: (month: YearMonth) =>
      Promise.resolve(structuredClone(store[month] ?? { month, targetCents: 0, achievedCents: 0 })),
    updateSavingsGoal,
    getSavingSummary: () => Promise.resolve([]),
    // GoalsPage also renders the category limits grid (Story 4.4); it is not under test here.
    listCategoryLimits: () => Promise.resolve([]),
    ...overrides,
  } as FinbankApi
  return { api, store, updateSavingsGoal }
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

async function openModal() {
  await screen.findByText('$12,500')
  fireEvent.click(screen.getByRole('button', { name: 'Adjust Goal' }))
  return screen.getByRole('dialog', { name: 'Adjust savings goal' })
}

const target = () => screen.getByLabelText('Target Amounts')
const present = () => screen.getByLabelText('Present Amounts')
const type = (input: HTMLElement, value: string) => fireEvent.change(input, { target: { value } })
const save = () => fireEvent.click(screen.getByRole('button', { name: 'Save' }))
const dialogClosed = () => waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

describe('AdjustSavingsGoalModal', () => {
  it('opens with both fields prefilled, an X and Save, and no visible title', async () => {
    renderPage(createFakeApi().api)
    const dialog = await openModal()
    expect(target()).toHaveValue('$20,000.00')
    expect(present()).toHaveValue('$12,500.00')
    expect(present()).toHaveAttribute('placeholder', 'Write present amount here')
    expect(target()).toHaveAttribute('inputmode', 'decimal')
    // 110.2: 56px fields, and a centred 192px Save rather than a full-width one.
    expect(target()).toHaveClass('h-14')
    expect(present()).toHaveClass('h-14')
    expect(within(dialog).getByRole('button', { name: 'Save' }).parentElement).toHaveClass('w-48')
    expect(within(dialog).getByRole('button', { name: 'Close' })).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Save' })).toBeEnabled()
    expect(within(dialog).queryByRole('heading')).not.toBeInTheDocument()
  })

  it('saves, closes, and the card already shows the new amounts and gauge', async () => {
    const { api, updateSavingsGoal } = createFakeApi()
    renderPage(api)
    await openModal()
    type(target(), '$25,000')
    type(present(), '13,000.5')
    save()
    await dialogClosed()
    expect(updateSavingsGoal).toHaveBeenCalledWith('2023-05', { targetCents: 2_500_000, achievedCents: 1_300_050 })
    const card = screen.getByTestId('savings-goal-card')
    // No waiting: the refetch settled before the modal closed.
    expect(within(card).getByText('$25,000')).toBeInTheDocument()
    expect(within(card).getByText('$13,001')).toBeInTheDocument()
    expect(within(card).getByText('13K')).toBeInTheDocument()
  })

  it('shows "Saving…" on a disabled Save while the save is pending', async () => {
    let resolve!: (goal: SavingsGoal) => void
    const { api } = createFakeApi({
      updateSavingsGoal: () =>
        new Promise<SavingsGoal>((r) => {
          resolve = r
        }),
    })
    renderPage(api)
    await openModal()
    save()
    const busy = await screen.findByRole('button', { name: 'Saving…' })
    expect(busy).toHaveAttribute('aria-disabled', 'true')
    resolve({ month: '2023-05' as YearMonth, targetCents: 2_000_000, achievedCents: 1_250_000 })
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
      updateSavingsGoal: () =>
        new Promise<SavingsGoal>((_resolve, r) => {
          reject = r
        }),
    })
    renderPage(api)
    await openModal()
    save()
    await screen.findByRole('button', { name: 'Saving…' })
    close()
    expect(screen.getByRole('dialog', { name: 'Adjust savings goal' })).toBeInTheDocument()
    reject(new ApiError('STORAGE_FULL', 'Your browser storage is full.'))
    expect(await screen.findByRole('alert')).toHaveTextContent('Your browser storage is full.')
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('calls updateSavingsGoal once for two quick Save clicks', async () => {
    const { api, updateSavingsGoal } = createFakeApi()
    renderPage(api)
    await openModal()
    save()
    save()
    await dialogClosed()
    expect(updateSavingsGoal).toHaveBeenCalledTimes(1)
  })

  it('accepts a present amount above the target', async () => {
    const { api, updateSavingsGoal } = createFakeApi()
    renderPage(api)
    await openModal()
    type(target(), '20000')
    type(present(), '30000')
    save()
    await dialogClosed()
    expect(updateSavingsGoal).toHaveBeenCalledWith('2023-05', { targetCents: 2_000_000, achievedCents: 3_000_000 })
  })

  it.each([
    ['', 'Enter an amount, like 1,234.50.'],
    ['abc', 'Enter an amount, like 1,234.50.'],
    ['1.234', 'Enter an amount, like 1,234.50.'],
    ['-5', "Amount can't be negative."],
  ])('blocks Save for %j with an inline error on each bad field', async (value, message) => {
    const { api, updateSavingsGoal } = createFakeApi()
    renderPage(api)
    await openModal()
    type(target(), value)
    type(present(), value)
    save()
    await waitFor(() => expect(target()).toHaveAttribute('aria-invalid', 'true'))
    expect(present()).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getAllByText(message)).toHaveLength(2)
    expect(screen.getAllByText(message)[0]).toHaveClass('text-danger')
    expect(updateSavingsGoal).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    // What the user typed survives the failed validation.
    expect(target()).toHaveValue(value)
  })

  it('saves after a validation error once the amount is corrected', async () => {
    const { api, updateSavingsGoal } = createFakeApi()
    renderPage(api)
    await openModal()
    type(target(), 'abc')
    save()
    await waitFor(() => expect(target()).toHaveAttribute('aria-invalid', 'true'))
    type(target(), '21000')
    save()
    await dialogClosed()
    expect(updateSavingsGoal).toHaveBeenCalledTimes(1)
    expect(updateSavingsGoal).toHaveBeenCalledWith('2023-05', { targetCents: 2_100_000, achievedCents: 1_250_000 })
  })

  it('marks only the bad field', async () => {
    renderPage(createFakeApi().api)
    await openModal()
    type(present(), 'abc')
    save()
    await waitFor(() => expect(present()).toHaveAttribute('aria-invalid', 'true'))
    expect(target()).not.toHaveAttribute('aria-invalid')
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
  ])('discards edits when closed with %s, and reopens with the stored values', async (_name, close) => {
    const { api, updateSavingsGoal } = createFakeApi()
    renderPage(api)
    await openModal()
    type(target(), '99')
    type(present(), '1')
    close()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(updateSavingsGoal).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Adjust Goal' }))
    expect(target()).toHaveValue('$20,000.00')
    expect(present()).toHaveValue('$12,500.00')
  })

  it('puts adapter field errors on their inputs and keeps the edits', async () => {
    const reject = vi.fn<FinbankApi['updateSavingsGoal']>().mockRejectedValueOnce(
      new ApiError('VALIDATION', 'Please correct the highlighted fields.', {
        targetCents: 'Target is too large.',
        achievedCents: 'Present is too large.',
      }),
    )
    const { api } = createFakeApi({ updateSavingsGoal: reject })
    renderPage(api)
    await openModal()
    type(target(), '123')
    save()
    expect(await screen.findByText('Target is too large.')).toBeInTheDocument()
    expect(screen.getByText('Present is too large.')).toBeInTheDocument()
    expect(target()).toHaveAttribute('aria-invalid', 'true')
    expect(present()).toHaveAttribute('aria-invalid', 'true')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(target()).toHaveValue('123')
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('shows any other adapter error as one alert above Save, and Save works again', async () => {
    const { api, store } = createFakeApi()
    const update = vi
      .fn<FinbankApi['updateSavingsGoal']>()
      .mockRejectedValueOnce(new ApiError('STORAGE_FULL', 'Your browser storage is full.'))
      .mockImplementation((month, amounts) => {
        store[month] = { month, ...amounts }
        return Promise.resolve(structuredClone(store[month]))
      })
    renderPage({ ...api, updateSavingsGoal: update })
    await openModal()
    type(target(), '21000')
    save()
    expect(await screen.findByRole('alert')).toHaveTextContent('Your browser storage is full.')
    expect(screen.getAllByRole('alert')).toHaveLength(1)
    expect(target()).toHaveValue('21000')
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled()
    save()
    await dialogClosed()
    expect(within(screen.getByTestId('savings-goal-card')).getByText('$21,000')).toBeInTheDocument()
  })

  it('creates the goal of a month that had none', async () => {
    const { api, updateSavingsGoal } = createFakeApi()
    renderPage(api)
    await screen.findByText('$12,500')
    fireEvent.click(screen.getByRole('button', { name: /Savings goal period/ }))
    fireEvent.click(within(screen.getByRole('listbox')).getByRole('option', { name: '01 Jun ~ 30 Jun' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Adjust Goal' })).toBeEnabled())
    fireEvent.click(screen.getByRole('button', { name: 'Adjust Goal' }))
    expect(target()).toHaveValue('$0.00')
    type(target(), '1000')
    type(present(), '0')
    save()
    await dialogClosed()
    expect(updateSavingsGoal).toHaveBeenCalledWith('2022-06', { targetCents: 100_000, achievedCents: 0 })
    fireEvent.click(screen.getByRole('button', { name: 'Adjust Goal' }))
    expect(target()).toHaveValue('$1,000.00')
  })
})
