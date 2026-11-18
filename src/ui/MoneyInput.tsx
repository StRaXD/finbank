import type { ChangeEvent } from 'react'
import { dollarsToCents } from '../lib/money.ts'
import { TextInput, type TextInputProps } from './TextInput.tsx'

export type MoneyInputProps = Omit<TextInputProps, 'type' | 'inputMode'> & {
  /** Called on every change with the typed amount in integer cents, or `null` when empty or unparseable. */
  onCentsChange?: (cents: number | null) => void
}

/**
 * A text field for a dollar amount ("$1,234.50"). It keeps the raw text (so `register` works and
 * what the user typed survives a failed validation) and reports cents through `onCentsChange`.
 */
export function MoneyInput({ onCentsChange, onChange, ...rest }: MoneyInputProps) {
  return (
    <TextInput
      inputMode="decimal"
      autoComplete="off"
      {...rest}
      type="text"
      onChange={(event: ChangeEvent<HTMLInputElement>) => {
        onChange?.(event)
        onCentsChange?.(dollarsToCents(event.target.value))
      }}
    />
  )
}
