import type { ComponentPropsWithRef } from 'react'
import { Field } from './Field.tsx'
import { emptyPlaceholder } from './fieldStyles.ts'

type PartProps = Omit<ComponentPropsWithRef<'input'>, 'className' | 'type' | 'aria-label'>

export type PhoneInputProps = {
  label: string
  /** The country code input ("+880"). It carries the visible label; `codeProps.id` is the field id. */
  codeProps?: PartProps
  /** The number input ("51547 58868"), named "{label} number". */
  numberProps?: PartProps
  error?: string
  /** `borderless`: no border box, as on the Settings screen. */
  variant?: 'default' | 'borderless'
}

const partBase =
  'min-w-0 bg-transparent text-16 text-ink-2 placeholder:text-subtle disabled:cursor-not-allowed disabled:text-faint'

/**
 * The plain "+code | number" phone field (111. Settings.png): one label over a country code input
 * and a number input, split by a `|` divider. Both parts are separate inputs, so react-hook-form can
 * `register` each one through `codeProps` / `numberProps`. The error is shared by both parts.
 */
export function PhoneInput({ label, codeProps = {}, numberProps = {}, error, variant = 'default' }: PhoneInputProps) {
  const { id, placeholder: codePlaceholder, ...code } = codeProps
  const { placeholder: numberPlaceholder, ...number } = numberProps
  // Same box as TextInput: borderless keeps a transparent border, turning danger only with an error.
  const border = error
    ? 'border-danger'
    : variant === 'borderless'
      ? 'border-transparent'
      : 'border-border focus-within:border-ink-2'
  const padding = variant === 'borderless' ? 'px-6' : 'px-4'
  return (
    <Field label={label} error={error} id={id} describedBy={code['aria-describedby']}>
      {(control) => (
        <div data-testid="phone-input" className={`flex h-12 w-full items-center gap-3 rounded-input border ${padding} ${border}`}>
          <input
            type="tel"
            inputMode="tel"
            autoComplete="tel-country-code"
            placeholder={codePlaceholder || emptyPlaceholder}
            {...code}
            {...control}
            className={`${partBase} w-14 shrink-0`}
          />
          <span aria-hidden="true" className="text-16 text-ink-2">
            |
          </span>
          <input
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            placeholder={numberPlaceholder || emptyPlaceholder}
            {...number}
            aria-label={`${label} number`}
            aria-describedby={[number['aria-describedby'], control['aria-describedby']].filter(Boolean).join(' ') || undefined}
            aria-invalid={control['aria-invalid']}
            className={`${partBase} flex-1`}
          />
        </div>
      )}
    </Field>
  )
}
