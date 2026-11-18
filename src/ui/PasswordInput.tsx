import { useState, type ComponentPropsWithRef } from 'react'
import { Field } from './Field.tsx'
import { emptyPlaceholder, fieldBase, fieldBorder, fieldText } from './fieldStyles.ts'
import { icons } from './icons.ts'

export type PasswordInputProps = Omit<ComponentPropsWithRef<'input'>, 'className' | 'type'> & {
  label: string
  error?: string
  /**
   * `borderless`: no border box, as on the Settings Security tab (112): an ink-2 label 12px above
   * a `subtle` value, like `TextInput`'s borderless variant. The eye toggle stays.
   */
  variant?: 'default' | 'borderless'
}

export function PasswordInput({ label, error, variant = 'default', id, placeholder, ...rest }: PasswordInputProps) {
  const [visible, setVisible] = useState(false)
  const Icon = visible ? icons.eyeOff : icons.eye
  // Borderless keeps a transparent border (same box size), turning danger only with an error.
  const borderless = variant === 'borderless'
  const look = borderless
    ? `pl-6 ${error ? 'border-danger' : 'border-transparent'}`
    : `pl-4 ${fieldBorder(Boolean(error))}`
  return (
    <Field
      label={label}
      error={error}
      id={id}
      describedBy={rest['aria-describedby']}
      labelTone={borderless ? 'ink-2' : 'ink'}
      labelGap={borderless ? 'md' : 'sm'}
    >
      {(control) => (
        <div className="relative">
          <input
            placeholder={placeholder || emptyPlaceholder}
            {...rest}
            {...control}
            type={visible ? 'text' : 'password'}
            className={`${fieldBase} ${fieldText(variant)} h-12 pr-14 ${look}`}
          />
          <button
            type="button"
            aria-label={visible ? 'Hide password' : 'Show password'}
            aria-pressed={visible}
            disabled={rest.disabled}
            onClick={() => setVisible((v) => !v)}
            className="absolute top-1/2 right-4 flex -translate-y-1/2 cursor-pointer items-center rounded-button text-subtle enabled:hover:text-ink-2 disabled:cursor-not-allowed disabled:text-faint"
          >
            <Icon aria-hidden="true" data-icon={visible ? 'eyeOff' : 'eye'} size={24} strokeWidth={1.5} />
          </button>
        </div>
      )}
    </Field>
  )
}
