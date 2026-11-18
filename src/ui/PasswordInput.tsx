import { useState, type ComponentPropsWithRef } from 'react'
import { Field } from './Field.tsx'
import { emptyPlaceholder, fieldBase, fieldBorder } from './fieldStyles.ts'
import { icons } from './icons.ts'

export type PasswordInputProps = Omit<ComponentPropsWithRef<'input'>, 'className' | 'type'> & {
  label: string
  error?: string
}

export function PasswordInput({ label, error, id, placeholder, ...rest }: PasswordInputProps) {
  const [visible, setVisible] = useState(false)
  const Icon = visible ? icons.eyeOff : icons.eye
  return (
    <Field label={label} error={error} id={id} describedBy={rest['aria-describedby']}>
      {(control) => (
        <div className="relative">
          <input
            placeholder={placeholder || emptyPlaceholder}
            {...rest}
            {...control}
            type={visible ? 'text' : 'password'}
            className={`${fieldBase} h-12 pr-14 pl-4 ${fieldBorder(Boolean(error))}`}
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
