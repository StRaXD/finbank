import { useId, useState } from 'react'
import type { TransactionKind } from '../../api/types.ts'
import { Card } from '../../ui/Card.tsx'
import { Tabs } from '../../ui/Tabs.tsx'
import { TransactionList } from './components/TransactionList.tsx'

type TabId = 'all' | TransactionKind

const tabs = [
  { id: 'all', label: 'All' },
  { id: 'revenue', label: 'Revenue' },
  { id: 'expense', label: 'Expenses' },
] as const satisfies readonly { id: TabId; label: string }[]

/** Transactions (107. Transactions.png): the title, All/Revenue/Expenses tabs, then the paged table. */
export function TransactionsPage() {
  const [tab, setTab] = useState<TabId>('all')
  const panelId = useId()
  const label = tabs.find((t) => t.id === tab)?.label
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-22 font-normal text-subtle">Recent Transaction</h1>
      <div className="mt-2">
        <Tabs tabs={tabs} value={tab} onChange={setTab} label="Transaction type" panelId={panelId} />
      </div>
      <div role="tabpanel" id={panelId} aria-label={label}>
        <Card>
          {/* Keyed by tab: a new filter always starts at its first page. */}
          <TransactionList key={tab} variant="table" kind={tab === 'all' ? undefined : tab} limit={10} loadMore />
        </Card>
      </div>
    </div>
  )
}
