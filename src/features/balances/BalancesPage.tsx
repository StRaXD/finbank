import { useAccounts } from '../../api/hooks/useAccounts.ts'
import { AsyncSection } from '../../ui/AsyncSection.tsx'
import { AccountCard } from './components/AccountCard.tsx'
import { AddAccountsCard } from './components/AddAccountsCard.tsx'
import type { AccountDetailsPath } from './paths.ts'

export type BalancesPageProps = {
  /** Builds an account's Account Details URL (owned by the app's route table). */
  accountDetailsPath: AccountDetailsPath
}

/** Balances (105. Balances.png): every account as a card in seed order, then the action card. */
export function BalancesPage({ accountDetailsPath }: BalancesPageProps) {
  const accounts = useAccounts()
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-22 font-normal text-subtle">Balances</h1>
      <AsyncSection query={accounts} isEmpty={(list) => list.length === 0} emptyMessage="No accounts yet.">
        {(list) => (
          <div className="grid grid-cols-3 gap-x-6 gap-y-8">
            {list.map((account) => (
              <AccountCard key={account.id} account={account} detailsHref={accountDetailsPath(account.id)} />
            ))}
            <AddAccountsCard />
          </div>
        )}
      </AsyncSection>
    </div>
  )
}
