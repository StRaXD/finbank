// The pieces shared by the goals feature's Adjust modals (AdjustSavingsGoalModal,
// AdjustCategoryLimitModal): the modal shell with the close-while-saving guard, and the form
// wrapper with the double-submit guard, the save-error mapping and the centred Save row. Local to
// features/goals because they wire `ApiError` and react-hook-form.
import { useRef, type FormEvent, type ReactNode } from 'react'
import type { FieldValues, Path, UseFormReturn, UseFormSetError } from 'react-hook-form'
import { ApiError } from '../../../api/types.ts'
import { Button } from '../../../ui/Button.tsx'
import { Modal } from '../../../ui/Modal.tsx'

const genericErrorMessage = 'Something went wrong. Please try again.'

/** The adapter's `fieldErrors` keys, mapped onto a form's inputs. */
export type FieldByApiField<TInput extends FieldValues> = Readonly<Record<string, Path<TInput>>>

/**
 * Shows a failed save on the form: each adapter field error whose key is in `fieldByApiField` goes
 * on that input; anything else (unmapped field errors, or the error's own message when nothing was
 * mapped) becomes one `root.server` message, shown as a single alert above Save.
 */
function showSubmitError<TInput extends FieldValues>(
  error: Error,
  fieldByApiField: FieldByApiField<TInput>,
  setError: UseFormSetError<TInput>,
) {
  const unmapped: string[] = []
  let mapped = 0
  if (error instanceof ApiError) {
    for (const [key, raw] of Object.entries(error.fieldErrors ?? {})) {
      const message = typeof raw === 'string' ? raw.trim() : ''
      if (!message) continue
      const field = Object.hasOwn(fieldByApiField, key) ? fieldByApiField[key] : undefined
      if (field) {
        setError(field, { message })
        mapped++
      } else {
        unmapped.push(message)
      }
    }
  }
  if (unmapped.length > 0) setError('root.server', { message: unmapped.join(' ') })
  else if (mapped === 0) setError('root.server', { message: error.message?.trim() || genericErrorMessage })
}

/** What `onSave` must hand to its mutation, so the form can show a failure and re-arm Save. */
export type SaveHandlers = {
  onError: (error: Error) => void
  onSettled: () => void
}

export type GoalModalFormProps<TInput extends FieldValues, TOutput> = {
  form: UseFormReturn<TInput, unknown, TOutput>
  fieldByApiField: FieldByApiField<TInput>
  /** The mutation's `isPending`: Save is disabled and reads "Saving…" while true. */
  pending: boolean
  /** Called with the validated values; spread `handlers` into the mutation's options. */
  onSave: (values: TOutput, handlers: SaveHandlers) => void
  /** The fields. */
  children: ReactNode
}

/**
 * The Adjust modals' form: the fields 24px apart, then one `role="alert"` server error, then the
 * centred 192px Save 32px below (110.2). One save runs at a time: the synchronous `inFlight` ref
 * drops a second submit made before `pending` flips (zod resolves asynchronously). A rejected save
 * is mapped through `fieldByApiField`, and the typed values are kept.
 */
export function GoalModalForm<TInput extends FieldValues, TOutput>({
  form,
  fieldByApiField,
  pending,
  onSave,
  children,
}: GoalModalFormProps<TInput, TOutput>) {
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
          onError: (error) => showSubmitError(error, fieldByApiField, setError),
          onSettled: settle,
        }),
      settle,
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
          <Button type="submit" fullWidth disabled={pending}>
            {pending ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </div>
    </form>
  )
}

export type GoalModalProps = {
  open: boolean
  onClose: () => void
  /** The dialog's accessible name (the modal has no visible title). */
  label: string
  /**
   * While true, X, Esc and an overlay click are ignored, so an edit is never persisted after a
   * "discard" and a rejection still reaches the open dialog.
   */
  pending: boolean
  children: ReactNode
}

/** The shared `Modal` shell of the Adjust modals, with close requests ignored while a save is pending. */
export function GoalModal({ open, onClose, label, pending, children }: GoalModalProps) {
  const requestClose = () => {
    if (!pending) onClose()
  }
  return (
    <Modal open={open} onClose={requestClose} label={label}>
      {children}
    </Modal>
  )
}
