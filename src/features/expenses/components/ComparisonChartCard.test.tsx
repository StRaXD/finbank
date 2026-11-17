import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
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

function renderCard(getComparison: FinbankApi['getComparison'], defaultGranularity: ComparisonGranularity = 'year') {
  const api = { getComparison } as FinbankApi
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <ApiProvider api={api}>
      <QueryClientProvider client={queryClient}>
        <ComparisonChartCard defaultGranularity={defaultGranularity} />
      </QueryClientProvider>
    </ApiProvider>,
  )
}

const resolveSeries = vi.fn<FinbankApi['getComparison']>((g) => Promise.resolve(structuredClone(series[g])))
const trigger = () => screen.getByRole('button', { name: /Comparison period/ })
const legend = () => screen.getAllByRole('listitem').map((li) => li.textContent)

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
})
