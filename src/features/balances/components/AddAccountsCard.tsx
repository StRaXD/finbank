import type { Ref } from 'react'
import { Button } from '../../../ui/Button.tsx'

export type AddAccountsCardProps = {
  /** Opens the Add account modal. */
  onAdd: () => void
  /** The "Add Accounts" button, so focus can return to it after a save. */
  addRef?: Ref<HTMLButtonElement>
  /** "Edit Accounts" (inert until Story 6.2) shows only when there are accounts to edit. */
  showEdit?: boolean
}

/** The last Balances tile: "Add Accounts" (opens the Add account modal) and "Edit Accounts". */
export function AddAccountsCard({ onAdd, addRef, showEdit = true }: AddAccountsCardProps) {
  return (
    <div
      data-testid="add-accounts-card"
      className="flex flex-col items-center justify-center gap-4 rounded-card bg-card p-6 shadow-card"
    >
      <Button ref={addRef} aria-haspopup="dialog" onClick={onAdd}>
        Add Accounts
      </Button>
      {showEdit && (
        // Inert until Story 6.2.
        <button type="button" className="cursor-pointer rounded-button text-16 text-subtle hover:underline">
          Edit Accounts
        </button>
      )}
    </div>
  )
}
