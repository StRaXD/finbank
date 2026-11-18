import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ApiProvider } from '../../api/ApiProvider.tsx'
import type { FinbankApi } from '../../api/port.ts'
import { ApiError, type CategoryLimit, type IsoDate, type SavingSummaryPoint, type SavingsGoal, type YearMonth } from '../../api/types.ts'
import { GoalsPage } from './GoalsPage.tsx'

const goals: Record<string, SavingsGoal> = {
  '2023-05': { month: '2023-05' as YearMonth, targetCents: 2_000_000, achievedCents: 1_250_000 },
  '2023-04': { month: '2023-04' as YearMonth, targetCents: 1_800_000, achievedCents: 1_710_000 },
}

const fromFixture: FinbankApi['getSavingsGoal'] = (month) =>
  Promise.resolve(structuredClone(goals[month] ?? { month, targetCents: 0, achievedCents: 0 }))

/** A tiny fixed series: two days of `month`, each value tagged by the month so tests can tell them apart. */
const summaryFixture: FinbankApi['getSavingSummary'] = (month) =>
  Promise.resolve<SavingSummaryPoint[]>([
    { date: `${month}-01` as IsoDate, currentCents: month === '2023-05' ? 10_000 : 20_000, previousCents: 5_000 },
    { date: `${month}-05` as IsoDate, currentCents: null, previousCents: 6_000 },
  ])

const limitsFixture: CategoryLimit[] = [
  { category: 'housing', limitCents: 100_000 },
  { category: 'food', limitCents: 50_000 },
  { category: 'transportation', limitCents: 30_000 },
  { category: 'entertainment', limitCents: 25_000 },
  { category: 'shopping', limitCents: 40_000 },
  { category: 'others', limitCents: 20_000 },
]

function renderWith(
  getSavingsGoal: FinbankApi['getSavingsGoal'] = fromFixture,
  getSavingSummary: FinbankApi['getSavingSummary'] = summaryFixture,
) {
  const api = {
    getToday: () => Promise.resolve('2023-05-19' as IsoDate),
    getSavingsGoal,
    getSavingSummary,
    listCategoryLimits: () => Promise.resolve(structuredClone(limitsFixture)),
  } as FinbankApi
  return renderApi(api)
}

function renderApi(api: FinbankApi) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <ApiProvider api={api}>
      <QueryClientProvider client={queryClient}>
        <GoalsPage />
      </QueryClientProvider>
    </ApiProvider>,
  )
}

const card = () => screen.getByTestId('savings-goal-card')
const periodTrigger = () => screen.getByRole('button', { name: /Savings goal period/ })
const summaryCard = () => screen.getByTestId('saving-summary-card')
const monthTrigger = () => screen.getByRole('button', { name: /Saving summary month/ })
const chartSummary = () => summaryCard().querySelector('p.sr-only')?.textContent ?? ''

describe('GoalsPage', () => {
  it('shows the visible Goals title above a 368/712 row with the goal card and the Saving Summary', async () => {
    renderWith()
    const heading = screen.getByRole('heading', { level: 1, name: 'Goals' })
    expect(heading).toHaveClass('text-22', 'font-normal', 'text-subtle')
    expect(heading).not.toHaveClass('sr-only')
    await screen.findByText('$12,500')
    const row = card().closest('.grid')
    expect(row).toHaveClass('grid-cols-[368fr_712fr]', 'gap-6')
    expect(row!.children).toHaveLength(2)
    expect(row!.children[1]).toContainElement(summaryCard())
  })

  it('shows the Saving Summary card: bold title, "May 2023", the legend and the chart', async () => {
    const getSavingSummary = vi.fn(summaryFixture)
    renderWith(fromFixture, getSavingSummary)
    await waitFor(() => expect(summaryCard().querySelector('[data-testid="comparison-area-chart"]')).not.toBeNull())
    const body = within(summaryCard())
    expect(body.getByRole('heading', { level: 2, name: 'Saving Summary' })).toHaveClass('text-16', 'font-bold', 'text-ink-2')
    expect(monthTrigger()).toHaveTextContent('May 2023')
    expect(body.getAllByRole('listitem').map((li) => li.textContent)).toEqual(['This month', 'Same period last month'])
    expect(body.getByRole('list')).toHaveClass('gap-[34px]')
    expect(getSavingSummary).toHaveBeenCalledWith('2023-05')
    expect(chartSummary()).toBe(
      'Saving summary for May 2023, daily savings. This month: $100 in total, highest $100 on day 1. Same period last month: $110 in total, highest $60 on day 5.',
    )
    fireEvent.click(monthTrigger())
    const options = within(screen.getByRole('listbox')).getAllByRole('option')
    expect(options).toHaveLength(12)
    expect(options[0]).toHaveTextContent('May 2023')
    expect(options[11]).toHaveTextContent('Jun 2022')
  })

  it.each([
    ['the Savings Goal card', () => periodTrigger(), '01 Apr ~ 30 Apr'],
    ['the Saving Summary card', () => monthTrigger(), 'Apr 2023'],
  ])('links both dropdowns: picking April in %s switches both cards', async (_name, trigger, option) => {
    const getSavingSummary = vi.fn(summaryFixture)
    renderWith(fromFixture, getSavingSummary)
    await screen.findByText('$12,500')
    fireEvent.click(trigger())
    fireEvent.click(screen.getByRole('option', { name: option }))
    expect(await screen.findByText('$17,100')).toBeInTheDocument()
    expect(periodTrigger()).toHaveTextContent('01 Apr ~ 30 Apr')
    expect(monthTrigger()).toHaveTextContent('Apr 2023')
    expect(getSavingSummary).toHaveBeenCalledWith('2023-04')
    await waitFor(() => expect(chartSummary()).toContain('Saving summary for Apr 2023'))
    expect(chartSummary()).toContain('This month: $200 in total')
  })

  it('shows the inline error with a working Retry when the saving summary fails', async () => {
    let fail = true
    renderWith(fromFixture, (month) =>
      fail ? Promise.reject(new ApiError('UNKNOWN', 'Could not load the summary.')) : summaryFixture(month),
    )
    await screen.findByTestId('saving-summary-card')
    expect(await within(summaryCard()).findByRole('alert')).toHaveTextContent('Could not load the summary.')
    fail = false
    fireEvent.click(within(summaryCard()).getByRole('button', { name: 'Retry' }))
    await waitFor(() => expect(chartSummary()).toContain('Saving summary for May 2023'))
  })

  it('says "no savings" for a month without a stored goal and keeps the flat chart', async () => {
    renderWith(fromFixture, (month) =>
      Promise.resolve<SavingSummaryPoint[]>([
        { date: `${month}-01` as IsoDate, currentCents: 0, previousCents: 0 },
        { date: `${month}-05` as IsoDate, currentCents: null, previousCents: 0 },
      ]),
    )
    await screen.findByTestId('saving-summary-card')
    await waitFor(() =>
      expect(chartSummary()).toBe(
        'Saving summary for May 2023, daily savings. This month: no savings. Same period last month: no savings.',
      ),
    )
    expect(summaryCard().querySelector('[data-testid="comparison-area-chart"]')).not.toBeNull()
  })

  it("shows May's goal by default: period, both amounts, gauge, caption and Adjust Goal", async () => {
    renderWith()
    expect(await screen.findByText('$12,500')).toBeInTheDocument()
    const body = within(card())
    expect(body.getByRole('heading', { level: 2, name: 'Savings Goal' })).toHaveClass('text-16', 'font-bold', 'text-ink-2')
    expect(periodTrigger()).toHaveTextContent('01 May ~ 31 May')
    expect(periodTrigger()).toHaveClass('bg-surface', 'h-8')
    expect(body.getByText('Target Achieved')).toBeInTheDocument()
    expect(body.getByText('This month Target')).toBeInTheDocument()
    expect(body.getByText('$20,000')).toBeInTheDocument()
    expect(body.getByText('12K')).toBeInTheDocument()
    expect(body.getByText('$0')).toBeInTheDocument()
    expect(body.getByText('$20k')).toBeInTheDocument()
    expect(body.getByText('Target vs Achievement')).toBeInTheDocument()
    expect(body.getByText('Savings goal for 01 May ~ 31 May: $12,500 achieved of a $20,000 target.')).toHaveClass('sr-only')
    expect(card().querySelector('[data-icon="trophy"]')).not.toBeNull()
    expect(card().querySelector('[data-icon="target"]')).not.toBeNull()
    const adjust = body.getByRole('button', { name: 'Adjust Goal' })
    expect(adjust).toHaveClass('border-primary', 'text-primary', 'h-9', 'text-14')
    expect(adjust.querySelector('[data-icon="pencil"]')).not.toBeNull()
  })

  it('lists the 12 selectable months newest first and loads the chosen month', async () => {
    const getSavingsGoal = vi.fn(fromFixture)
    renderWith(getSavingsGoal)
    await screen.findByText('$12,500')
    fireEvent.click(periodTrigger())
    const options = within(screen.getByRole('listbox')).getAllByRole('option')
    expect(options).toHaveLength(12)
    expect(options[0]).toHaveTextContent('01 May ~ 31 May')
    expect(options[1]).toHaveTextContent('01 Apr ~ 30 Apr')
    expect(options[11]).toHaveTextContent('01 Jun ~ 30 Jun')
    fireEvent.click(options[1]!)
    expect(await screen.findByText('$17,100')).toBeInTheDocument()
    expect(screen.getByText('$18,000')).toBeInTheDocument()
    expect(periodTrigger()).toHaveTextContent('01 Apr ~ 30 Apr')
    expect(getSavingsGoal).toHaveBeenCalledWith('2023-04')
  })

  it('renders a month without a goal as an empty gauge', async () => {
    renderWith()
    await screen.findByText('$12,500')
    fireEvent.click(periodTrigger())
    fireEvent.click(screen.getByRole('option', { name: '01 Jan ~ 31 Jan' }))
    await waitFor(() => expect(screen.getByTestId('goal-gauge')).toHaveAttribute('data-ratio', '0'))
    expect(screen.getAllByText('$0').length).toBeGreaterThanOrEqual(2)
  })

  it('opens the Adjust savings goal dialog from Adjust Goal, disabled until the goal loads', async () => {
    const pending = renderWith(() => new Promise<SavingsGoal>(() => {}))
    expect(await screen.findByRole('button', { name: 'Adjust Goal' })).toBeDisabled()
    pending.unmount()
    renderWith()
    await screen.findByText('$12,500')
    fireEvent.click(screen.getByRole('button', { name: 'Adjust Goal' }))
    expect(screen.getByRole('dialog', { name: 'Adjust savings goal' })).toBeInTheDocument()
  })

  it('shows the inline error with a working Retry when the goal query fails', async () => {
    let fail = true
    renderWith((month) => (fail ? Promise.reject(new ApiError('UNKNOWN', 'Could not load the goal.')) : fromFixture(month)))
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load the goal.')
    fail = false
    fireEvent.click(within(card()).getByRole('button', { name: 'Retry' }))
    expect(await screen.findByText('$12,500')).toBeInTheDocument()
  })

  it('shows "Expenses Goals by Category" with six limit cards in fixed order, exact style, outlined Adjust', async () => {
    renderWith()
    const heading = screen.getByRole('heading', { level: 2, name: 'Expenses Goals by Category' })
    expect(heading).toHaveClass('text-22', 'font-normal', 'text-subtle')
    await waitFor(() => expect(screen.getAllByTestId('category-limit-card')).toHaveLength(6))
    const grid = screen.getByTestId('category-limit-grid')
    expect(grid).toHaveClass('grid-cols-3', 'gap-x-6', 'gap-y-4')
    const cards = screen.getAllByTestId('category-limit-card')
    expect(cards.map((el) => el.querySelector('h3')?.textContent)).toEqual([
      'Housing',
      'Food',
      'Transportation',
      'Entertainment',
      'Shopping',
      'Others',
    ])
    expect(cards.map((el) => within(el).getByText(/^\$/).textContent)).toEqual([
      '$1,000.00',
      '$500.00',
      '$300.00',
      '$250.00',
      '$400.00',
      '$200.00',
    ])
    const housing = within(screen.getByRole('article', { name: 'Housing' }))
    const adjust = housing.getByRole('button', { name: 'Adjust Housing limit' })
    expect(adjust).toHaveTextContent('Adjust')
    expect(adjust).toHaveClass('border-primary', 'text-primary', 'h-9', 'text-14')
    expect(adjust.querySelector('[data-icon="pencil"]')).not.toBeNull()
    expect(housing.getByTestId('category-icon')).toHaveClass('h-12', 'w-10')
    // No over-limit state: nothing but the icon, name, limit and Adjust.
    expect(cards[0]!.textContent).toBe('Housing$1,000.00Adjust')
  })

  it('shows the inline error with a working Retry when the category limits fail', async () => {
    let fail = true
    const api = {
      getToday: () => Promise.resolve('2023-05-19' as IsoDate),
      getSavingsGoal: fromFixture,
      getSavingSummary: summaryFixture,
      listCategoryLimits: () =>
        fail ? Promise.reject(new ApiError('UNKNOWN', 'Could not load the limits.')) : Promise.resolve(limitsFixture),
    } as FinbankApi
    renderApi(api)
    const section = () => screen.getByRole('region', { name: 'Expenses Goals by Category' })
    expect(await within(section()).findByRole('alert')).toHaveTextContent('Could not load the limits.')
    fail = false
    fireEvent.click(within(section()).getByRole('button', { name: 'Retry' }))
    await waitFor(() => expect(screen.getAllByTestId('category-limit-card')).toHaveLength(6))
  })

  it('shows a skeleton while the goal loads', async () => {
    renderWith(() => new Promise(() => {}))
    expect(await screen.findByRole('button', { name: /Savings goal period/ })).toBeInTheDocument()
    expect(card().querySelector('[aria-busy="true"]')).not.toBeNull()
  })
})
