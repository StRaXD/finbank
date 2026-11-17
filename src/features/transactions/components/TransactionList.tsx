import type { ReactNode } from 'react'
import { useTransactions } from '../../../api/hooks/useTransactions.ts'
import type { Transaction, TransactionKind } from '../../../api/types.ts'
import { formatDate, formatMoney } from '../../../lib/format.ts'
import { AsyncSection } from '../../../ui/AsyncSection.tsx'
import { transactionIcons } from '../../../ui/icons.ts'
import { LoadMore } from '../../../ui/LoadMore.tsx'
import { Table, type TableColumn } from '../../../ui/Table.tsx'

export type TransactionListProps = {
  /** `table` for the full pages, `compact` for the Overview widget (104). */
  variant: 'table' | 'compact'
  kind?: TransactionKind
  accountId?: string
  /** Page size: 10 on the full pages, 5 on Overview. */
  limit: number
  /** Shows "Load More" under the list while more rows remain. */
  loadMore?: boolean
}

function ItemIcon({ transaction }: { transaction: Transaction }) {
  const Icon = transactionIcons[transaction.icon]
  return (
    <span className="flex size-8 shrink-0 items-center justify-center rounded-button bg-surface text-ink-2">
      <Icon aria-hidden="true" data-icon={transaction.icon} size={20} />
    </span>
  )
}

const columns: readonly TableColumn<Transaction>[] = [
  {
    key: 'item',
    header: 'Items',
    render: (t) => (
      <span className="flex items-center gap-2">
        <ItemIcon transaction={t} />
        <span className="font-bold text-ink">{t.item}</span>
      </span>
    ),
  },
  { key: 'shop', header: 'Shop Name', align: 'center', render: (t) => <span className="text-muted">{t.shop}</span> },
  {
    key: 'date',
    header: 'Date',
    align: 'center',
    render: (t) => <span className="whitespace-nowrap text-muted">{formatDate(t.date, 'row')}</span>,
  },
  {
    key: 'paymentMethod',
    header: 'Payment Method',
    align: 'center',
    render: (t) => <span className="text-muted">{t.paymentMethod}</span>,
  },
  {
    key: 'amount',
    header: 'Amount',
    align: 'right',
    // Revenue and expense look the same: no sign, no colour.
    render: (t) => <span className="font-bold text-ink">{formatMoney(t.amountCents, 'exact')}</span>,
  },
]

function CompactRows({ rows }: { rows: readonly Transaction[] }) {
  return (
    <ul className="flex flex-col divide-y divide-border">
      {rows.map((t) => (
        <li key={t.id} className="flex items-center gap-4 py-4">
          <ItemIcon transaction={t} />
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="text-16 font-semibold text-ink">{t.item}</span>
            <span className="text-14 text-subtle">{t.shop}</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-16 font-bold text-ink">{formatMoney(t.amountCents, 'exact')}</span>
            <span className="text-14 text-subtle">{formatDate(t.date, 'row')}</span>
          </div>
        </li>
      ))}
    </ul>
  )
}

/**
 * The one transaction list (AD-14): owns its `useTransactions` query, renders the loaded pages
 * as one list, and appends the next page on "Load More".
 */
export function TransactionList({ variant, kind, accountId, limit, loadMore = false }: TransactionListProps) {
  const query = useTransactions({ kind, accountId, limit })
  return (
    <AsyncSection
      query={query}
      isEmpty={(data) => data.pages.every((page) => page.items.length === 0)}
      emptyMessage="No transactions yet."
    >
      {(data) => {
        const rows = data.pages.flatMap((page) => page.items)
        let list: ReactNode
        if (variant === 'compact') list = <CompactRows rows={rows} />
        else list = <Table columns={columns} rows={rows} rowKey={(t) => t.id} caption="Transactions" />
        return (
          <>
            {list}
            {loadMore && (
              <LoadMore
                hasMore={query.hasNextPage}
                loading={query.isFetchingNextPage}
                onClick={() => void query.fetchNextPage()}
                error={query.isFetchNextPageError ? query.error?.message || 'Could not load more transactions.' : undefined}
              />
            )}
          </>
        )
      }}
    </AsyncSection>
  )
}
