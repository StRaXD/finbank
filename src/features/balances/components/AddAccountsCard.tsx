import { Button } from '../../../ui/Button.tsx'

/** The last Balances tile: "Add Accounts" and "Edit Accounts", both inert in this release. */
export function AddAccountsCard() {
  return (
    <div
      data-testid="add-accounts-card"
      className="flex flex-col items-center justify-center gap-4 rounded-card bg-card p-6 shadow-card"
    >
      <Button>Add Accounts</Button>
      <button type="button" className="cursor-pointer rounded-button text-16 text-subtle hover:underline">
        Edit Accounts
      </button>
    </div>
  )
}
