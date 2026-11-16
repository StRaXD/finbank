import type { ComponentPropsWithRef } from 'react'
import { Field } from './Field.tsx'
import { icons } from './icons.ts'

export type CheckboxProps = Omit<ComponentPropsWithRef<'input'>, 'className' | 'type'> & {
  label: string
  error?: string
}

const CheckIcon = icons.check

/** Native checkbox (keyboard-operable) drawn as a teal square with a white check. */
export function Checkbox({ label, error, id, ...rest }: CheckboxProps) {
  return (
    <Field label={label} error={error} id={id} describedBy={rest['aria-describedby']} layout="inline">
      {(control) => (
        <span className="relative inline-flex size-5 shrink-0">
          <input
            {...rest}
            {...control}
            type="checkbox"
            className={`peer size-5 cursor-pointer appearance-none rounded-checkbox border bg-white checked:border-primary checked:bg-primary disabled:cursor-not-allowed disabled:bg-disabled disabled:checked:border-faint disabled:checked:bg-faint ${
              error ? 'border-danger' : 'border-faint'
            }`}
          />
          <CheckIcon
            aria-hidden="true"
            data-icon="check"
            size={16}
            strokeWidth={3}
            className="pointer-events-none absolute inset-0.5 hidden text-white peer-checked:block"
          />
        </span>
      )}
    </Field>
  )
}
