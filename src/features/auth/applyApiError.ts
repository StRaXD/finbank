import type { FieldValues, Path, UseFormSetError } from 'react-hook-form'
import type { ApiError } from '../../api/types.ts'

export const genericErrorMessage = 'Something went wrong. Please try again.'

/** The alert text for an error: its trimmed `message`, or a generic fallback when that is empty. */
export function alertMessage(error: ApiError): string {
  return error.message?.trim() || genericErrorMessage
}

/**
 * Maps a failed auth submit onto the form: `fieldErrors` for the given fields go to their inputs;
 * other field messages (or the error's `message` when none map) go to the `root.server` alert.
 * Empty field messages are ignored, and an empty alert falls back to a generic message.
 */
export function applyApiError<T extends FieldValues>(
  error: ApiError,
  fields: readonly Path<T>[],
  setError: UseFormSetError<T>,
) {
  const unmapped: string[] = []
  let mapped = 0
  for (const [key, raw] of Object.entries(error.fieldErrors ?? {})) {
    const message = typeof raw === 'string' ? raw.trim() : ''
    if (!message) continue
    const field = fields.find((name) => name === key)
    if (field) {
      setError(field, { message })
      mapped++
    } else {
      unmapped.push(message)
    }
  }
  if (unmapped.length > 0) setError('root.server', { message: unmapped.join(' ') })
  else if (mapped === 0) setError('root.server', { message: alertMessage(error) })
}
