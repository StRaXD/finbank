import { useAccounts } from '../../../api/hooks/useAccounts.ts'
import { useBalanceSummary } from '../../../api/hooks/useBalanceSummary.ts'
import { formatMoney } from '../../../lib/format.ts'
import { AsyncSection } from '../../../ui/AsyncSection.tsx'
import { Card } from '../../../ui/Card.tsx'
import { Carousel } from '../../../ui/Carousel.tsx'
import { AccountCard, type AccountDetailsPath } from '../../balances/index.ts'

export type TotalBalanceCardProps = {
  accountDetailsPath: AccountDetailsPath
}

const emptyMessage = 'No accounts yet.'

/**
 * Total Balance (104. Overview.png): the adapter-derived total over "All Accounts" and a divider,
 * then one teal slide per account. The total and the slides read the same queries as Balances, so
 * a removal anywhere updates both through the existing invalidation.
 */
export function TotalBalanceCard({ accountDetailsPath }: TotalBalanceCardProps) {
  const summary = useBalanceSummary()
  const accounts = useAccounts()
  return (
    <Card title="Total Balance">
      <div className="flex flex-col gap-3">
        <div className="flex min-h-10 items-center justify-between gap-4 border-b border-border pb-2">
          <div className="min-w-0 flex-1">
            <AsyncSection query={summary} emptyMessage={emptyMessage}>
              {(data) => (
                // 104 sets the total 4px above the row's centre; shifted visually so the divider stays put.
                <p data-testid="total-balance" className="relative -top-1 text-22 font-extrabold text-ink">
                  {formatMoney(data.totalBalanceCents, 'whole')}
                </p>
              )}
            </AsyncSection>
          </div>
          <span className="relative -top-1 shrink-0 text-14 font-medium text-ink-2">All Accounts</span>
        </div>
        <AsyncSection query={accounts} isEmpty={(list) => list.length === 0} emptyMessage={emptyMessage}>
          {(list) => (
            <Carousel
              label="Accounts"
              items={list}
              getKey={(account) => account.id}
              renderItem={(account) => (
                <AccountCard
                  variant="carousel"
                  account={account}
                  detailsHref={accountDetailsPath(account.id)}
                />
              )}
            />
          )}
        </AsyncSection>
      </div>
    </Card>
  )
}
