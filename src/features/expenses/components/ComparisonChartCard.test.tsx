import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ApiProvider } from '../../../api/ApiProvider.tsx'
import type { FinbankApi } from '../../../api/port.ts'
import { ApiError, type ComparisonGranularity, type ComparisonPoint } from '../../../api/types.ts'
import { ComparisonChartCard } from './ComparisonChartCard.tsx'

/** Already derived, as the adapter returns them; the card must show these numbers as given. */
const series: Record<ComparisonGranularity, ComparisonPoint[]> = {
  year: [
    { label: 'Jan', currentCents: 520_000, previousCents: 420_000 },
    { label: 'May', currentCents: 742_809, previousCents: 1_250_000 },
    { label: 'Jun', currentCents: null, previousCents: 560_000 },
  ],
  week: [
    { label: '19 Fri', currentCents: 0, previousCents: 299_499 },
    { label: '20 Sat', currentCents: null, previousCents: 0 },
  ],
}

/** The seed's week of 14 May: the largest value is last week's Friday, about $2,995. */
const seedWeek: ComparisonPoint[] = [
  { label: '14 Sun', currentCents: 6_800, previousCents: 120_000 },
  { label: '15 Mon', currentCents: 4_520, previousCents: 0 },
  { label: '16 Tue', currentCents: 0, previousCents: 45_000 },
  { label: '17 Wed', currentCents: 26_700, previousCents: 0 },
  { label: '18 Thu', currentCents: 0, previousCents: 80_000 },
  { label: '19 Fri', currentCents: 0, previousCents: 299_499 },
  { label: '20 Sat', currentCents: null, previousCents: 0 },
]

function renderCard(
  getComparison: FinbankApi['getComparison'],
  defaultGranularity: ComparisonGranularity = 'year',
  title?: string,
) {
  const api = { getComparison } as FinbankApi
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <ApiProvider api={api}>
      <QueryClientProvider client={queryClient}>
        <ComparisonChartCard defaultGranularity={defaultGranularity} {...(title === undefined ? {} : { title })} />
      </QueryClientProvider>
    </ApiProvider>,
  )
}

const resolveSeries = vi.fn<FinbankApi['getComparison']>((g) => Promise.resolve(structuredClone(series[g])))
const trigger = () => screen.getByRole('button', { name: /Comparison period/ })
const legend = () => screen.getAllByRole('listitem').map((li) => li.textContent)
const yLabels = () =>
  [...screen.getByTestId('comparison-chart').querySelectorAll('.recharts-yAxis-tick-labels .recharts-cartesian-axis-tick-value')].map(
    (t) => t.textContent,
  )
const K0 = ['$0', '$2', '$10', '$50', '$250']
const K2 = ['$0', '$200', '$1k', '$5k', '$25k']

describe('ComparisonChartCard', () => {
  it('shows the Monthly series with the This Year / Last Year legend and a summary of the points as given', async () => {
    renderCard(resolveSeries)
    expect(trigger()).toHaveTextContent('Monthly Comparison')
    expect(legend()).toEqual(['This Year', 'Last Year'])
    const summary = await screen.findByText(/^Monthly expenses/)
    expect(summary).toHaveClass('sr-only')
    expect(summary).toHaveTextContent(
      'Monthly expenses, this year compared with last year. Jan: this year $5,200, last year $4,200. ' +
        'May: this year $7,428, last year $12,500. Jun: this year no data yet, last year $5,600.',
    )
    expect(screen.getByTestId('comparison-chart')).toHaveAttribute('aria-hidden', 'true')
    expect(resolveSeries).toHaveBeenCalledWith('year')
  })

  it('switches to the Weekly series and legend when Weekly Comparison is picked', async () => {
    renderCard(resolveSeries)
    await screen.findByText(/^Monthly expenses/)
    fireEvent.click(trigger())
    fireEvent.click(screen.getByRole('option', { name: 'Weekly Comparison' }))
    expect(trigger()).toHaveTextContent('Weekly Comparison')
    expect(legend()).toEqual(['This week', 'Last week'])
    const summary = await screen.findByText(/^Daily expenses/)
    expect(summary).toHaveTextContent(
      'Daily expenses, this week compared with last week. 19 Fri: this week $0, last week $2,995. ' +
        '20 Sat: this week no data yet, last week $0.',
    )
    expect(resolveSeries).toHaveBeenCalledWith('week')
  })

  it('starts on the given default granularity', async () => {
    renderCard(resolveSeries, 'week')
    expect(trigger()).toHaveTextContent('Weekly Comparison')
    expect(await screen.findByText(/^Daily expenses/)).toBeInTheDocument()
  })

  it('shows an inline error with Retry inside the card, with the dropdown still usable', async () => {
    const get = vi
      .fn<FinbankApi['getComparison']>()
      .mockRejectedValueOnce(new ApiError('UNKNOWN', 'Could not load the comparison.'))
      .mockImplementation((g) => Promise.resolve(structuredClone(series[g])))
    renderCard(get)
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load the comparison.')
    expect(trigger()).toBeEnabled()
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(await screen.findByText(/^Monthly expenses/)).toBeInTheDocument()
    expect(get).toHaveBeenCalledTimes(2)
  })

  it('lets the user switch period while the first load has failed', async () => {
    const get = vi.fn<FinbankApi['getComparison']>((g) =>
      g === 'year' ? Promise.reject(new ApiError('UNKNOWN', 'Nope.')) : Promise.resolve(structuredClone(series.week)),
    )
    renderCard(get)
    await screen.findByRole('alert')
    fireEvent.click(trigger())
    fireEvent.click(screen.getByRole('option', { name: 'Weekly Comparison' }))
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument())
    expect(await screen.findByText(/^Daily expenses/)).toBeInTheDocument()
  })

  it('fits the axis to the weekly seed: ladder k = 2, $0 to $25k', async () => {
    renderCard(() => Promise.resolve(structuredClone(seedWeek)), 'week')
    await screen.findByText(/^Daily expenses/)
    await waitFor(() => expect(yLabels()).toEqual(K2))
  })

  it('refits the axis when the granularity changes', async () => {
    const small: ComparisonPoint[] = [
      { label: 'Jan', currentCents: 40_00, previousCents: 12_00 },
      { label: 'Feb', currentCents: null, previousCents: 0 },
    ]
    renderCard((g) => Promise.resolve(structuredClone(g === 'year' ? small : seedWeek)))
    await screen.findByText(/^Monthly expenses/)
    await waitFor(() => expect(yLabels()).toEqual(K0))
    fireEvent.click(trigger())
    fireEvent.click(screen.getByRole('option', { name: 'Weekly Comparison' }))
    await screen.findByText(/^Daily expenses/)
    await waitFor(() => expect(yLabels()).toEqual(K2))
  })

  it('fits the axis to the current series when it is the larger one', async () => {
    renderCard(() =>
      Promise.resolve([
        { label: 'Jan', currentCents: 30_000_00, previousCents: 1_000_00 },
        { label: 'Feb', currentCents: null, previousCents: 500_00 },
      ]),
    )
    await screen.findByText(/^Monthly expenses/)
    await waitFor(() => expect(yLabels()).toEqual(['$0', '$2k', '$10k', '$50k', '$250k']))
  })

  it('labels the k = 1 ladder exactly, with a one-decimal top tick', async () => {
    renderCard(() => Promise.resolve([{ label: 'Jan', currentCents: 1_800_00, previousCents: 300_00 }]))
    await screen.findByText(/^Monthly expenses/)
    await waitFor(() => expect(yLabels()).toEqual(['$0', '$20', '$100', '$500', '$2.5k']))
  })

  it('uses ladder k = 0 for an all-zero series', async () => {
    renderCard(() => Promise.resolve([{ label: 'Jan', currentCents: 0, previousCents: 0 }]))
    await screen.findByText(/^Monthly expenses/)
    await waitFor(() => expect(yLabels()).toEqual(K0))
  })

  it('shows an optional title above the card, as the region name', async () => {
    renderCard(resolveSeries, 'week', 'Statistics')
    const region = screen.getByRole('region', { name: 'Statistics' })
    expect(within(region).getByRole('heading', { level: 2, name: 'Statistics' })).toHaveClass('text-22', 'text-subtle')
    expect(await within(region).findByText(/^Daily expenses/)).toBeInTheDocument()
  })

  it('has no title by default', () => {
    renderCard(resolveSeries)
    expect(screen.queryByRole('heading')).not.toBeInTheDocument()
  })
})
