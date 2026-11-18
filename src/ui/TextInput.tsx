import type { ComponentPropsWithRef } from 'react'
import { Field } from './Field.tsx'
import { emptyPlaceholder, fieldBase, fieldBorder } from './fieldStyles.ts'

export type TextInputProps = Omit<ComponentPropsWithRef<'input'>, 'className'> & {
  label: string
  error?: string
  /** `borderless`: no border box, as on the Settings screen. */
  variant?: 'default' | 'borderless'
  /**
   * `md`: the 48px form field with a `text-ink` label. `lg`: the 56px, 24px-padded field of the
   * Goals modals (110.2), whose label is `text-ink-2`.
   */
  fieldSize?: 'md' | 'lg'
}

export function TextInput({ label, error, variant = 'default', fieldSize = 'md', id, type = 'text', placeholder, ...rest }: TextInputProps) {
  // Borderless keeps a transparent border (same box size), turning danger only with an error.
  const height = fieldSize === 'lg' ? 'h-14' : 'h-12'
  const padding = variant === 'borderless' || fieldSize === 'lg' ? 'px-6' : 'px-4'
  const look =
    variant === 'borderless'
      ? `${height} ${padding} ${error ? 'border-danger' : 'border-transparent'}`
      : `${height} ${padding} ${fieldBorder(Boolean(error))}`
  return (
    <Field
      label={label}
      error={error}
      id={id}
      describedBy={rest['aria-describedby']}
      labelTone={fieldSize === 'lg' ? 'ink-2' : 'ink'}
    >
      {(control) => <input type={type} placeholder={placeholder || emptyPlaceholder} {...rest} {...control} className={`${fieldBase} ${look}`} />}
    </Field>
  )
}
