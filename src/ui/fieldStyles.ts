// Internal: shared class strings for the bordered input fields.

/** Every bordered field except its height (`h-12` by default; see `TextInput`'s `fieldSize`). */
export const fieldBase =
  'w-full rounded-input border bg-transparent text-16 text-ink-2 placeholder:text-subtle disabled:cursor-not-allowed disabled:text-faint'

/**
 * `:placeholder-shown` only matches inputs that have a placeholder, so fields default it to a
 * single space; otherwise an empty field would look "filled".
 */
export const emptyPlaceholder = ' '

/** Default `border` token; `ink-2` when focused or filled; `danger` with an error. */
export function fieldBorder(hasError: boolean) {
  return hasError ? 'border-danger' : 'border-border focus:border-ink-2 not-placeholder-shown:border-ink-2'
}
