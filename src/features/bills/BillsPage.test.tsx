import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { ApiProvider } from '../../api/ApiProvider.tsx'
import type { FinbankApi } from '../../api/port.ts'
import { ApiError, type Bill, type IsoDate, type ListBillsInput } from '../../api/types.ts'
import adobeLogo from '../../assets/brands/adobe.svg'
import figmaLogo from '../../assets/brands/figma.svg'
import googleLogo from '../../assets/brands/google.svg'
import { BillsPage } from './BillsPage.tsx'
import { BillList } from './index.ts'

const bill = (patch: Partial<Bill> & Pick<Bill, 'id' | 'vendor' | 'logo'>): Bill => ({
  title: `${patch.vendor} - Yearly Plan`,
  description: `${patch.vendor} plan blurb.`,
  billingCycle: 'yearly',
  dueDate: '2023-05-25' as IsoDate,
  lastChargeDate: '2022-05-25' as IsoDate,
  amountCents: 15_000,
  ...patch,
})

/** Already in due-date order, as the adapter returns them. */
const fixture: Bill[] = [
  bill({ id: 'bill_1', vendor: 'Figma', logo: 'figma', amountCents: 15_049 }),
  bill({
    id: 'bill_2',
    vendor: 'Adobe',
    logo: 'adobe',
    title: 'Adobe Inc - Yearly Plan',
    dueDate: '2023-06-16' as IsoDate,
    lastChargeDate: '2022-06-16' as IsoDate,
    // Exactly half a dollar: rounds up to $559.
    amountCents: 55_850,
  }),
  bill({
    id: 'bill_3',
    vendor: 'Google',
    logo: 'google',
    billingCycle: 'monthly',
    dueDate: '2023-06-18' as IsoDate,
    lastChargeDate: '2023-05-18' as IsoDate,
    amountCents: 7_200,
  }),
]

const listing = (rows: Bill[] = fixture) =>
  vi.fn(({ limit }: ListBillsInput = {}) => Promise.resolve(structuredClone(limit ? rows.slice(0, limit) : rows)))

function renderWith(listBills: FinbankApi['listBills'], ui: ReactNode = <BillsPage />) {
  const api = { listBills } as FinbankApi
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <ApiProvider api={api}>
      <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
    </ApiProvider>,
  )
}

const bodyRows = () => within(screen.getByRole('table')).getAllByRole('row').slice(1)

describe('BillsPage', () => {
  it('shows the title and a skeleton while loading', () => {
    renderWith(() => new Promise(() => {}))
    expect(screen.getByRole('heading', { level: 1, name: 'Upcoming Bills' })).toHaveClass('text-22', 'text-subtle')
    expect(screen.getByTestId('skeleton')).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('renders the columns and one formatted row per bill, with no actions', async () => {
    const list = listing()
    renderWith(list)
    const table = await screen.findByRole('table', { name: 'Upcoming Bills' })
    expect(list).toHaveBeenCalledWith({})
    expect(within(table).getAllByRole('columnheader').map((h) => h.textContent)).toEqual([
      'Due Date',
      'Logo',
      'Item Description',
      'Last Charge',
      'Amount',
    ])
    expect(bodyRows()).toHaveLength(3)

    const cells = within(bodyRows()[0]!).getAllByRole('cell')
    expect(within(cells[0]!).getByRole('img', { name: 'Due May 25' })).toBeInTheDocument()
    expect(cells[0]).toHaveClass('py-8')
    expect(cells[1]!.querySelector('img[data-logo="figma"]')).not.toBeNull()
    expect(within(cells[1]!).getByText('Figma')).toBeInTheDocument()
    expect(within(cells[2]!).getByText('Figma - Yearly Plan')).toHaveClass('font-bold')
    expect(within(cells[2]!).getByText('Figma plan blurb.')).toHaveClass('text-subtle')
    expect(cells[3]).toHaveTextContent('25 May 2022')
    expect(cells[3]).toHaveClass('text-center')
    expect(cells[4]).toHaveClass('text-right')
    // Whole dollars in the outlined box: $150.49 rounds down to $150 (and $558.50 up to $559 below).
    expect(within(cells[4]!).getByText('$150')).toHaveClass('border', 'border-border', 'font-bold')

    const adobe = within(bodyRows()[1]!).getAllByRole('cell')
    expect(within(adobe[0]!).getByRole('img', { name: 'Due Jun 16' })).toBeInTheDocument()
    expect(within(adobe[1]!).getByText('Adobe').parentElement).toHaveClass('text-brand-adobe')
    expect(within(adobe[4]!).getByText('$559')).toBeInTheDocument()
    expect(within(bodyRows()[2]!).getByText('Google').parentElement).toHaveClass('text-ink')

    const logoSrcs = bodyRows().map((row) => {
      const img = within(row).getAllByRole('cell')[1]!.querySelector('img[data-logo]')!
      return [img.getAttribute('data-logo'), img.getAttribute('src')]
    })
    expect(logoSrcs).toEqual([
      ['figma', figmaLogo],
      ['adobe', adobeLogo],
      ['google', googleLogo],
    ])

    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('shows the empty line when there are no bills', async () => {
    renderWith(listing([]))
    expect(await screen.findByText('No upcoming bills.')).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('shows the error with Retry, and recovers on retry', async () => {
    const ok = listing()
    let fail = true
    renderWith((input) => (fail ? Promise.reject(new ApiError('UNKNOWN', 'Could not load bills.')) : ok(input)))
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load bills.')
    fail = false
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    await waitFor(() => expect(bodyRows()).toHaveLength(3))
  })
})

describe('BillList compact', () => {
  it('renders the badge, logo and name, title, last charge and boxed amount for the limit', async () => {
    const list = listing()
    renderWith(list, <BillList variant="compact" limit={2} />)
    const items = await screen.findAllByRole('listitem')
    expect(list).toHaveBeenCalledWith({ limit: 2 })
    expect(items).toHaveLength(2)
    const first = items[0]!
    expect(within(first).getByRole('img', { name: 'Due May 25' })).toBeInTheDocument()
    expect(first.querySelector('img[data-logo="figma"]')).not.toBeNull()
    expect(within(first).getByText('Figma')).toBeInTheDocument()
    const title = within(first).getByText('Figma - Yearly Plan')
    expect(title).toHaveClass('truncate')
    expect(title).toHaveAttribute('title', 'Figma - Yearly Plan')
    // Muted (AA on white) and truncated, so it never spills under the amount box.
    expect(within(first).getByText('Last Charge - 25 May 2022')).toHaveClass('text-muted', 'truncate')
    expect(within(first).getByText('$150')).toHaveClass('border')
    expect(within(items[1]!).getByText('$559')).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })
})
