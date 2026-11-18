// The shared form modal (110.2): the `Modal` shell with the close-while-saving guard, and the form
// wrapper with the double-submit guard, the save-error mapping and the centred Save row. Used by
// the Goals Adjust modals and the Account modal. Components and types only (`only-export-components`).
import { useRef, type FormEvent, type ReactNode } from 'react'
import type { FieldErrors, FieldValues, UseFormReturn } from 'react-hook-form'
import { Button } from './Button.tsx'
import { mapApiFieldErrors, type FieldByApiField } from './mapApiFieldErrors.ts'
import { Modal, type ModalPlacement } from './Modal.tsx'

export type { FieldByApiField } from './mapApiFieldErrors.ts'

/** What `onSave` must hand to its mutation, so the form can show a failure and re-arm Save. */
export type SaveHandlers = {
  onError: (error: Error) => void
  onSettled: () => void
}

export type FormModalFormProps<TInput extends FieldValues, TOutput> = {
  form: UseFormReturn<TInput, unknown, TOutput>
  fieldByApiField: FieldByApiField<TInput>
  /** The mutation's `isPending`: Save is `aria-disabled` and reads "Saving…" while true. */
  pending: boolean
  /** Called with the validated values; spread `handlers` into the mutation's options. */
  onSave: (values: TOutput, handlers: SaveHandlers) => void
  /** Focus the first field an adapter error lands on (client errors always focus their field). */
  focusServerErrors?: boolean
  /**
   * Called after a client-side validation failure, e.g. to focus the first invalid field in
   * display order when the form sets `shouldFocusError: false`.
   */
  onInvalid?: (errors: FieldErrors<TInput>) => void
  /** The fields. */
  children: ReactNode
}

/**
 * A modal form: the fields 24px apart, then one `role="alert"` server error, then the centred
 * 192px Save 32px below (110.2). One save runs at a time: the synchronous `inFlight` ref drops a
 * second submit made before `pending` flips (zod resolves asynchronously). While saving, Save is
 * `aria-disabled` rather than `disabled`, so focus stays on it inside the modal. A rejected save
 * is mapped through `fieldByApiField`, and the typed values are kept.
 */
export function FormModalForm<TInput extends FieldValues, TOutput>({
  form,
  fieldByApiField,
  pending,
  onSave,
  focusServerErrors = false,
  onInvalid,
  children,
}: FormModalFormProps<TInput, TOutput>) {
  const inFlight = useRef(false)
  const {
    handleSubmit,
    setError,
    clearErrors,
    formState: { errors },
  } = form

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    if (inFlight.current || pending) {
      event.preventDefault()
      return
    }
    inFlight.current = true
    clearErrors()
    const settle = () => {
      inFlight.current = false
    }
    void handleSubmit(
      (values) =>
        onSave(values, {
          onError: (error) => mapApiFieldErrors(error, fieldByApiField, setError, { focusFirst: focusServerErrors }),
          onSettled: settle,
        }),
      (invalid) => {
        settle()
        onInvalid?.(invalid)
      },
    )(event)
  }

  const serverError = errors.root?.server?.message
  return (
    <form noValidate onSubmit={onSubmit} className="flex flex-col">
      <div className="flex flex-col gap-6">{children}</div>
      {serverError && (
        <p role="alert" className="mt-4 text-14 text-danger">
          {serverError}
        </p>
      )}
      <div className="mt-8 flex justify-center">
        <div className="w-48">
          <Button type="submit" fullWidth aria-disabled={pending || undefined}>
            {pending ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </div>
    </form>
  )
}

export type FormModalProps = {
  open: boolean
  onClose: () => void
  /** The dialog's accessible name (the modal has no visible title). */
  label: string
  /**
   * While true, X, Esc and an overlay click are ignored, so an edit is never persisted after a
   * "discard" and a rejection still reaches the open dialog.
   */
  pending: boolean
  /** See `Modal`'s `placement`: `tall` for forms too tall for the default anchor. */
  placement?: ModalPlacement
  children: ReactNode
}

/** The `Modal` shell of a form modal, with close requests ignored while a save is pending. */
export function FormModal({ open, onClose, label, pending, placement, children }: FormModalProps) {
  const requestClose = () => {
    if (!pending) onClose()
  }
  return (
    <Modal open={open} onClose={requestClose} label={label} placement={placement}>
      {children}
    </Modal>
  )
}
