import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router'
import { useAccounts } from '../../api/hooks/useAccounts.ts'
import type { Account } from '../../api/types.ts'
import { AsyncSection } from '../../ui/AsyncSection.tsx'
import { AccountCard } from './components/AccountCard.tsx'
import { AddAccountsCard } from './components/AddAccountsCard.tsx'
import { RemoveAccountDialog } from './components/RemoveAccountDialog.tsx'
import type { AccountDetailsPath, BalancesLocationState } from './paths.ts'

export type BalancesPageProps = {
  /** Builds an account's Account Details URL (owned by the app's route table). */
  accountDetailsPath: AccountDetailsPath
}

/** Balances (105. Balances.png): every account as a card in seed order, then the action card. */
export function BalancesPage({ accountDetailsPath }: BalancesPageProps) {
  const accounts = useAccounts()
  const [removing, setRemoving] = useState<Account | null>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const focusHeading = (useLocation().state as BalancesLocationState | null)?.focusHeading === true
  // Arriving from a removal on Account Details: its Remove button is gone, so focus the title.
  useEffect(() => {
    if (focusHeading) headingRef.current?.focus()
  }, [focusHeading])
  return (
    <div className="flex flex-col gap-4">
      <h1 ref={headingRef} tabIndex={-1} className="text-22 font-normal text-subtle focus-visible:outline-none">
        Balances
      </h1>
      <AsyncSection query={accounts} isEmpty={(list) => list.length === 0} emptyMessage="No accounts yet.">
        {(list) => (
          <div className="grid grid-cols-3 gap-x-6 gap-y-8">
            {list.map((account) => (
              <AccountCard
                key={account.id}
                account={account}
                detailsHref={accountDetailsPath(account.id)}
                onRemove={setRemoving}
              />
            ))}
            <AddAccountsCard />
          </div>
        )}
      </AsyncSection>
      <RemoveAccountDialog
        account={removing}
        onClose={() => setRemoving(null)}
        // The Remove button that opened the dialog is gone, so focus the page title, not <body>.
        onRemoved={() => headingRef.current?.focus()}
      />
    </div>
  )
}
