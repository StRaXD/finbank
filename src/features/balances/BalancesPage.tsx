import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router'
import { useAccounts } from '../../api/hooks/useAccounts.ts'
import type { Account } from '../../api/types.ts'
import { AsyncSection } from '../../ui/AsyncSection.tsx'
import { EmptyState } from '../../ui/EmptyState.tsx'
import { AccountCard } from './components/AccountCard.tsx'
import { AccountFormModal } from './components/AccountFormModal.tsx'
import { AddAccountsCard } from './components/AddAccountsCard.tsx'
import { RemoveAccountDialog } from './components/RemoveAccountDialog.tsx'
import type { AccountDetailsPath, BalancesLocationState } from './paths.ts'

/** The empty Balances line (one copy for `AsyncSection` and the empty-state branch). */
const noAccountsMessage = 'No accounts yet.'

export type BalancesPageProps = {
  /** Builds an account's Account Details URL (owned by the app's route table). */
  accountDetailsPath: AccountDetailsPath
}

/**
 * Balances (105. Balances.png): every account as a card in stored order, then the action card,
 * whose "Add Accounts" opens the Add account modal. With no accounts, "No accounts yet." and the
 * action card (without "Edit Accounts"). The modal's open state lives here, outside
 * `AsyncSection`, so it survives the empty list turning into the grid.
 */
export function BalancesPage({ accountDetailsPath }: BalancesPageProps) {
  const accounts = useAccounts()
  const [removing, setRemoving] = useState<Account | null>(null)
  const [adding, setAdding] = useState(false)
  const [saves, setSaves] = useState(0)
  // One ref for whichever action card is mounted (the empty state's, then the grid's).
  const addRef = useRef<HTMLButtonElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const focusHeading = (useLocation().state as BalancesLocationState | null)?.focusHeading === true
  // Arriving from a removal on Account Details: its Remove button is gone, so focus the title.
  useEffect(() => {
    if (focusHeading) headingRef.current?.focus()
  }, [focusHeading])
  // After a save, focus "Add Accounts" in its new place: the button that opened the modal may have
  // been replaced (the empty state became the grid). Runs after the modal's own focus return.
  useEffect(() => {
    if (saves > 0) addRef.current?.focus()
  }, [saves])
  const openAdd = () => setAdding(true)
  return (
    <div className="flex flex-col gap-4">
      <h1 ref={headingRef} tabIndex={-1} className="text-22 font-normal text-subtle focus-visible:outline-none">
        Balances
      </h1>
      <AsyncSection query={accounts} emptyMessage={noAccountsMessage}>
        {(list) =>
          list.length === 0 ? (
            <div className="flex flex-col gap-4">
              <EmptyState message={noAccountsMessage} />
              <div className="grid grid-cols-3 gap-x-6 gap-y-8">
                <AddAccountsCard onAdd={openAdd} addRef={addRef} showEdit={false} />
              </div>
            </div>
          ) : (
          <div className="grid grid-cols-3 gap-x-6 gap-y-8">
            {list.map((account) => (
              <AccountCard
                key={account.id}
                account={account}
                detailsHref={accountDetailsPath(account.id)}
                onRemove={setRemoving}
              />
            ))}
            <AddAccountsCard onAdd={openAdd} addRef={addRef} />
          </div>
          )
        }
      </AsyncSection>
      <AccountFormModal open={adding} onClose={() => setAdding(false)} onSaved={() => setSaves((n) => n + 1)} />
      <RemoveAccountDialog
        account={removing}
        onClose={() => setRemoving(null)}
        // The Remove button that opened the dialog is gone, so focus the page title, not <body>.
        onRemoved={() => headingRef.current?.focus()}
      />
    </div>
  )
}
