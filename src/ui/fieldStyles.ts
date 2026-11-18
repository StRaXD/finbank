// Internal: shared class strings for the bordered input fields.

/**
 * Every field except its height (`h-12` by default; see `TextInput`'s `fieldSize`) and its text
 * colour (`fieldText`).
 */
export const fieldBase =
  'w-full rounded-input border bg-transparent text-16 placeholder:text-subtle disabled:cursor-not-allowed disabled:text-faint'

/**
 * Field value colour. `default`: ink-2. `borderless` (111. Settings.png samples the PNG grey that `subtle`
 * darkens for AA contrast): `subtle`.
 */
export function fieldText(variant: 'default' | 'borderless' = 'default') {
  return variant === 'borderless' ? 'text-subtle' : 'text-ink-2'
}

/**
 * `:placeholder-shown` only matches inputs that have a placeholder, so fields default it to a
 * single space; otherwise an empty field would look "filled".
 */
export const emptyPlaceholder = ' '

/** Default `border` token; `ink-2` when focused or filled; `danger` with an error. */
export function fieldBorder(hasError: boolean) {
  return hasError ? 'border-danger' : 'border-border focus:border-ink-2 not-placeholder-shown:border-ink-2'
}

/**
 * `fieldBorder` for a control without `:placeholder-shown` (the `field` Dropdown): `ink-2` when
 * focused or `filled`, `danger` with an error.
 */
export function fieldBorderClosed(hasError: boolean, filled: boolean) {
  if (hasError) return 'border-danger'
  return filled ? 'border-ink-2' : 'border-border focus:border-ink-2'
}
