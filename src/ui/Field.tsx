// Internal: shared label / error / aria-describedby wiring for the input primitives.
// Not part of the public ui API.
import { useId, type ReactNode } from 'react'

export type FieldControlProps = {
  id: string
  'aria-describedby'?: string
  'aria-invalid'?: true
}

type FieldProps = {
  label: string
  error?: string
  /** Caller-supplied id for the control; a `useId()` id is used otherwise. */
  id?: string
  /** Caller-supplied `aria-describedby`, merged with the error id. */
  describedBy?: string
  /** `stacked`: label above the control. `inline`: label to the right (checkbox). */
  layout?: 'stacked' | 'inline'
  /** Stacked label colour: `ink` (forms such as Login) or `ink-2` (the 110.2 Goals modals). */
  labelTone?: 'ink' | 'ink-2'
  children: (control: FieldControlProps) => ReactNode
}

export function Field({ label, error, id, describedBy, layout = 'stacked', labelTone = 'ink', children }: FieldProps) {
  const generatedId = useId()
  // `||` so an empty-string id falls back too (keeps htmlFor and the error id valid).
  const controlId = id || generatedId
  const errorId = `${controlId}-error`
  const ariaDescribedBy = [describedBy, error ? errorId : undefined].filter(Boolean).join(' ') || undefined

  const control = children({
    id: controlId,
    'aria-describedby': ariaDescribedBy,
    ...(error ? { 'aria-invalid': true as const } : {}),
  })

  const errorText = error ? (
    <p id={errorId} className="mt-2 text-14 text-danger">
      {error}
    </p>
  ) : null

  if (layout === 'inline') {
    return (
      <div className="flex flex-col">
        <div className="flex items-center gap-4">
          {control}
          <label htmlFor={controlId} className="text-16 font-normal text-ink">
            {label}
          </label>
        </div>
        {errorText}
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      <label htmlFor={controlId} className={`mb-2 text-16 font-medium ${labelTone === 'ink-2' ? 'text-ink-2' : 'text-ink'}`}>
        {label}
      </label>
      {control}
      {errorText}
    </div>
  )
}
