import { useEffect, useRef } from 'react'
import { useRemoveAccount } from '../../../api/hooks/useRemoveAccount.ts'
import type { Account } from '../../../api/types.ts'
import { maskAccountNumber } from '../../../lib/format.ts'
import { ConfirmDialog } from '../../../ui/ConfirmDialog.tsx'
import { accountTypeLabels } from '../accountTypeLabels.ts'

export type RemoveAccountDialogProps = {
  /** The account to remove; the dialog is open while this is non-null. */
  account: Account | null
  /** Called on Cancel, Esc, the X, and after a successful removal. */
  onClose: () => void
  /**
   * Called only after the account is removed and the affected queries have refetched, before
   * `onClose` (Balances moves focus; Account Details navigates to Balances here).
   */
  onRemoved?: (account: Account) => void
}

/**
 * Confirms and performs an account removal (Balances and Account Details). A failure keeps the
 * dialog open with the error inline, and Confirm can be retried.
 */
export function RemoveAccountDialog({ account, onClose, onRemoved }: RemoveAccountDialogProps) {
  const removal = useRemoveAccount()
  const { reset } = removal
  const open = account !== null
  // isPending reaches the buttons only after a re-render, so a synchronous flag drops a second
  // confirm (e.g. a double click) while one removal is in flight.
  const inFlight = useRef(false)

  // A fresh dialog never shows a previous attempt's error: reset on every open, and on cancel too
  // so a reopened dialog does not flash the old error for a frame before the effect runs.
  useEffect(() => {
    if (!open) return
    inFlight.current = false
    reset()
  }, [open, reset])

  const cancel = () => {
    reset()
    onClose()
  }

  const message = account
    ? `Your ${accountTypeLabels[account.type]} account at ${account.bankName} (${maskAccountNumber(account.accountNumber, 'groups')}) will be removed.`
    : ''

  return (
    <ConfirmDialog
      open={open}
      title="Remove account?"
      message={message}
      confirmLabel="Remove"
      pending={removal.isPending}
      error={removal.error?.message}
      onCancel={cancel}
      onConfirm={() => {
        if (!account || inFlight.current) return
        inFlight.current = true
        removal.mutate(account.id, {
          onSettled: () => {
            inFlight.current = false
          },
          onSuccess: () => {
            onRemoved?.(account)
            onClose()
          },
        })
      }}
    />
  )
}
