// Maps a failed save onto a react-hook-form form. Shared by the `FormModalForm` modals; the
// non-modal forms (auth, ProfileForm, PasswordForm) can adopt it later.
import type { FieldValues, Path, UseFormSetError } from 'react-hook-form'
// Type-only: the AD-1 boundary forbids a runtime import from api in ui, so `fieldErrors` is read
// structurally rather than through `instanceof ApiError`.
import type { ApiError } from '../api/types.ts'

export const GENERIC_SAVE_ERROR_MESSAGE = 'Something went wrong. Please try again.'

/** The adapter's `fieldErrors` keys, mapped onto a form's inputs. */
export type FieldByApiField<TInput extends FieldValues> = Readonly<Record<string, Path<TInput>>>

export type MapApiFieldErrorsOptions = {
  /** Focus the first input that receives an error (react-hook-form's `shouldFocus`). */
  focusFirst?: boolean
}

/** The `fieldErrors` of an `ApiError`-shaped error, or `undefined`. */
function fieldErrorsOf(error: unknown): ApiError['fieldErrors'] {
  if (typeof error !== 'object' || error === null) return undefined
  const { fieldErrors } = error as { fieldErrors?: unknown }
  if (typeof fieldErrors !== 'object' || fieldErrors === null || Array.isArray(fieldErrors)) return undefined
  return fieldErrors as Record<string, string>
}

/**
 * Shows a failed save on the form: each adapter field error whose key is in `fieldByApiField` goes
 * on that input; anything else (unmapped field errors, or the error's own message when nothing was
 * mapped) becomes one `root.server` message, shown as a single alert above Save.
 */
export function mapApiFieldErrors<TInput extends FieldValues>(
  error: unknown,
  fieldByApiField: FieldByApiField<TInput>,
  setError: UseFormSetError<TInput>,
  options: MapApiFieldErrorsOptions = {},
): void {
  const unmapped: string[] = []
  let mapped = 0
  for (const [key, raw] of Object.entries(fieldErrorsOf(error) ?? {})) {
    const message = typeof raw === 'string' ? raw.trim() : ''
    if (!message) continue
    const field = Object.hasOwn(fieldByApiField, key) ? fieldByApiField[key] : undefined
    if (field) {
      setError(field, { message }, { shouldFocus: options.focusFirst === true && mapped === 0 })
      mapped++
    } else {
      unmapped.push(message)
    }
  }
  if (unmapped.length > 0) {
    setError('root.server', { message: unmapped.join(' ') })
  } else if (mapped === 0) {
    const message = error instanceof Error && typeof error.message === 'string' ? error.message.trim() : ''
    setError('root.server', { message: message || GENERIC_SAVE_ERROR_MESSAGE })
  }
}
