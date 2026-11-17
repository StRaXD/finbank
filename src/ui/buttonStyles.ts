// The button look, shared by `Button` and by links that must look like buttons ("Details >").

export type ButtonVariant = 'primary' | 'outline' | 'text' | 'google'
export type ButtonSize = 'md' | 'sm'

// Boxed variants share the grey disabled look of the grey "Login" in Components-1.png.
// `aria-disabled` gets the same look, for buttons that must keep focus while busy (LoadMore).
const boxedDisabled =
  'disabled:border-transparent disabled:bg-disabled disabled:text-muted aria-disabled:cursor-not-allowed aria-disabled:border-transparent aria-disabled:bg-disabled aria-disabled:text-muted'

// A button hovers only while it is enabled and not `aria-disabled` (LoadMore while busy), so a
// greyed-out button never darkens or underlines under the pointer.
export const BUTTON_HOVER_GATE = 'enabled:not-aria-disabled:hover:'

// Full literals (not built from the gate), so Tailwind's source scan generates every class.
const hoverClass: Record<ButtonVariant, { button: string; link: string }> = {
  primary: { button: 'enabled:not-aria-disabled:hover:brightness-90', link: 'hover:brightness-90' },
  outline: { button: 'enabled:not-aria-disabled:hover:bg-primary/10', link: 'hover:bg-primary/10' },
  text: { button: 'enabled:not-aria-disabled:hover:underline', link: 'hover:underline' },
  google: { button: 'enabled:not-aria-disabled:hover:brightness-95', link: 'hover:brightness-95' },
}

const variants: Record<ButtonVariant, string> = {
  primary: `border border-transparent bg-primary font-bold text-white ${boxedDisabled}`,
  outline: `border border-primary bg-transparent font-medium text-primary ${boxedDisabled}`,
  text: 'font-semibold text-primary disabled:text-faint',
  google: `border border-transparent bg-google font-normal text-ink-2 ${boxedDisabled}`,
}

const boxedSizes: Record<ButtonSize, string> = {
  md: 'h-12 gap-2 px-6 text-16',
  sm: 'h-8 gap-1 px-3 text-12',
}

// The text variant has no padding box.
const textSizes: Record<ButtonSize, string> = {
  md: 'gap-2 text-16',
  sm: 'gap-1 text-14',
}

export type ButtonClassOptions = {
  variant?: ButtonVariant
  size?: ButtonSize
  fullWidth?: boolean
  /** `true` for an `<a>` styled as a button: hover is not gated on `:enabled`. */
  asLink?: boolean
}

export function buttonClassName({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  asLink = false,
}: ButtonClassOptions = {}): string {
  // A link has no `enabled` state, so its hover applies unconditionally.
  const hover = hoverClass[variant][asLink ? 'link' : 'button']
  return [
    'inline-flex cursor-pointer items-center justify-center rounded-button transition disabled:cursor-not-allowed',
    variants[variant],
    hover,
    variant === 'text' ? textSizes[size] : boxedSizes[size],
    variant === 'google' && size === 'md' ? 'gap-4' : '',
    fullWidth ? 'w-full' : '',
  ]
    .filter(Boolean)
    .join(' ')
}

/** Icon size that goes with each button size. */
export const buttonIconSize: Record<ButtonSize, number> = { md: 20, sm: 16 }
