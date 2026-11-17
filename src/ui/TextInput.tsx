import type { ComponentPropsWithRef } from 'react'
import { Field } from './Field.tsx'
import { emptyPlaceholder, fieldBase, fieldBorder } from './fieldStyles.ts'

export type TextInputProps = Omit<ComponentPropsWithRef<'input'>, 'className'> & {
  label: string
  error?: string
  /** `borderless`: no border box, as on the Settings screen. */
  variant?: 'default' | 'borderless'
}

export function TextInput({ label, error, variant = 'default', id, type = 'text', placeholder, ...rest }: TextInputProps) {
  // Borderless keeps a transparent border (same box size), turning danger only with an error.
  const look =
    variant === 'borderless'
      ? `px-6 ${error ? 'border-danger' : 'border-transparent'}`
      : `px-4 ${fieldBorder(Boolean(error))}`
  return (
    <Field label={label} error={error} id={id} describedBy={rest['aria-describedby']}>
      {(control) => <input type={type} placeholder={placeholder || emptyPlaceholder} {...rest} {...control} className={`${fieldBase} ${look}`} />}
    </Field>
  )
}
