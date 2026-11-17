import { Button } from './Button.tsx'
import { Modal } from './Modal.tsx'

export type ConfirmDialogProps = {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
  /** While true, both buttons are disabled and Esc, the X and an overlay click are ignored. */
  pending?: boolean
  /** An inline danger line under the message (e.g. a failed confirm); Confirm stays retryable. */
  error?: string
}

/**
 * A yes/no question on top of `Modal`. Only Confirm calls `onConfirm`; Cancel, Esc, the X and an
 * overlay click all call `onCancel`. Confirm is the teal primary button (no danger variant).
 */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  pending = false,
  error,
}: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      title={title}
      onClose={() => {
        if (!pending) onCancel()
      }}
    >
      <p className="text-16 text-muted">{message}</p>
      {error && (
        <p role="alert" className="mt-4 text-14 text-danger">
          {error}
        </p>
      )}
      <div className="mt-8 flex justify-center gap-4">
        <Button variant="outline" disabled={pending} onClick={onCancel}>
          {cancelLabel}
        </Button>
        <Button disabled={pending} onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  )
}
