import { useBills } from '../../../api/hooks/useBills.ts'
import type { Bill } from '../../../api/types.ts'
import { formatDate, formatMoney } from '../../../lib/format.ts'
import { AsyncSection } from '../../../ui/AsyncSection.tsx'
import { DateBadge } from '../../../ui/DateBadge.tsx'
import { Table, type TableColumn } from '../../../ui/Table.tsx'
import { VendorLogo } from './VendorLogo.tsx'

export type BillListProps = {
  /** `table` for the Upcoming Bills page (108), `compact` for the Overview widget (104). */
  variant: 'table' | 'compact'
  /** At most this many bills (2 on Overview); every bill when omitted. */
  limit?: number
}

/** The whole-dollar amount in an outlined rounded box (108, 104). */
function AmountBox({ cents, size = 'md' }: { cents: number; size?: 'md' | 'sm' }) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-input border border-border font-bold text-ink ${
        size === 'md' ? 'h-12 min-w-27 px-6 text-20' : 'h-11 min-w-21 px-4 text-18'
      }`}
    >
      {formatMoney(cents, 'whole')}
    </span>
  )
}

// Widths measured from 108. Bills.png: Logo starts at 11% of the table, Item Description at 28%,
// Last Charge is centred at 72%, and Amount ends at the right edge.
const columns: readonly TableColumn<Bill>[] = [
  { key: 'dueDate', header: 'Due Date', width: '10.6%', render: (b) => <DateBadge date={b.dueDate} /> },
  {
    key: 'logo',
    header: 'Logo',
    width: '17.4%',
    render: (b) => <VendorLogo logo={b.logo} vendor={b.vendor} />,
  },
  {
    key: 'description',
    header: 'Item Description',
    width: '34%',
    render: (b) => (
      <div className="flex max-w-68 flex-col gap-2">
        <span className="text-18 font-bold text-ink">{b.title}</span>
        <span className="text-14 leading-5.5 text-faint">{b.description}</span>
      </div>
    ),
  },
  {
    key: 'lastCharge',
    header: 'Last Charge',
    align: 'center',
    width: '19.1%',
    render: (b) => <span className="whitespace-nowrap text-faint">{formatDate(b.lastChargeDate, 'row')}</span>,
  },
  {
    key: 'amount',
    // Centred over the right-aligned 108px amount box, as in 108. Bills.png.
    header: <span className="inline-block w-27 text-center">Amount</span>,
    align: 'right',
    width: '18.9%',
    render: (b) => <AmountBox cents={b.amountCents} />,
  },
]

function CompactRows({ rows }: { rows: readonly Bill[] }) {
  return (
    <ul className="flex flex-col divide-y divide-border">
      {rows.map((b) => (
        <li key={b.id} className="flex items-center gap-4 py-4 first:pt-0 last:pb-0">
          <DateBadge date={b.dueDate} size="sm" />
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <VendorLogo logo={b.logo} vendor={b.vendor} size="sm" />
            <span className="text-18 font-bold text-ink">{b.title}</span>
            <span className="text-14 text-faint">Last Charge - {formatDate(b.lastChargeDate, 'row')}</span>
          </div>
          <AmountBox cents={b.amountCents} size="sm" />
        </li>
      ))}
    </ul>
  )
}

/** The one bill list (AD-14): owns its `useBills` query and renders the bills by due date. */
export function BillList({ variant, limit }: BillListProps) {
  const query = useBills({ limit })
  return (
    <AsyncSection query={query} isEmpty={(bills) => bills.length === 0} emptyMessage="No upcoming bills.">
      {(bills) =>
        variant === 'compact' ? (
          <CompactRows rows={bills} />
        ) : (
          <Table columns={columns} rows={bills} rowKey={(b) => b.id} caption="Upcoming Bills" density="lg" />
        )
      }
    </AsyncSection>
  )
}
