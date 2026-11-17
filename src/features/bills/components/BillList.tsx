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

/** The whole-dollar amount in an outlined rounded box: 108×48 on 108, 68×40 on 104. */
function AmountBox({ cents, size = 'md' }: { cents: number; size?: 'md' | 'sm' }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-input border border-border font-bold ${
        size === 'md' ? 'h-12 min-w-27 px-6 text-20 text-ink' : 'h-10 min-w-17 px-3 text-18 text-ink-2'
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

// Measured from 104. Overview.png: a 44×66 badge 12px from the text, rows 20px either side of the
// divider, the title in ink-2 and the 68×40 amount box.
function CompactRows({ rows }: { rows: readonly Bill[] }) {
  return (
    <ul className="flex flex-col divide-y divide-border">
      {rows.map((b) => (
        <li key={b.id} className="flex items-center gap-3 py-5 first:pt-0 last:pb-0">
          <DateBadge date={b.dueDate} size="sm" />
          <div className="flex min-w-0 flex-1 flex-col items-start">
            <VendorLogo logo={b.logo} vendor={b.vendor} size="sm" />
            {/* One line as in 104: longer titles end in an ellipsis (full text stays in the DOM and on /bills). */}
            <span title={b.title} className="block max-w-full truncate text-18 font-bold text-ink-2">
              {b.title}
            </span>
            <span className="block max-w-full truncate text-12 text-muted">Last Charge - {formatDate(b.lastChargeDate, 'row')}</span>
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
