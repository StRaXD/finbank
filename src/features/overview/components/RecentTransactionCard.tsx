import { useId, useState } from 'react'
import type { TransactionKind } from '../../../api/types.ts'
import { Card } from '../../../ui/Card.tsx'
import { Tabs } from '../../../ui/Tabs.tsx'
import { TransactionList } from '../../transactions/index.ts'
import { ViewAllLink } from './ViewAllLink.tsx'

export type RecentTransactionCardProps = {
  /** The Transactions page URL (owned by the app's route table). */
  transactionsPath: string
}

type TabId = 'all' | TransactionKind

const tabs = [
  { id: 'all', label: 'All' },
  { id: 'revenue', label: 'Revenue' },
  { id: 'expense', label: 'Expenses' },
] as const satisfies readonly { id: TabId; label: string }[]

/**
 * Recent Transaction (104. Overview.png): All / Revenue / Expenses tabs over the transactions
 * feature's own compact list of the five newest rows of that kind, read through the same
 * `useTransactions` hook and data source as the Transactions page. No Load More here.
 */
export function RecentTransactionCard({ transactionsPath }: RecentTransactionCardProps) {
  const [tab, setTab] = useState<TabId>('all')
  const panelId = useId()
  const label = tabs.find((t) => t.id === tab)?.label
  return (
    <Card title="Recent Transaction" actions={<ViewAllLink to={transactionsPath} what="transactions" />}>
      <div className="flex flex-col gap-3">
        <Tabs tabs={tabs} value={tab} onChange={setTab} label="Transaction type" panelId={panelId} />
        <div role="tabpanel" id={panelId} aria-label={label}>
          {/* Keyed by tab: each filter is its own query and starts fresh. */}
          <TransactionList key={tab} variant="compact" kind={tab === 'all' ? undefined : tab} limit={5} />
        </div>
      </div>
    </Card>
  )
}
