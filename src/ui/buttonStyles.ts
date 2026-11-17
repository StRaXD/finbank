// The button look, shared by `Button` and by links that must look like buttons ("Details >").

export type ButtonVariant = 'primary' | 'outline' | 'text' | 'google'
export type ButtonSize = 'md' | 'sm'

// Boxed variants share the grey disabled look of the grey "Login" in Components-1.png.
const boxedDisabled = 'disabled:border-transparent disabled:bg-disabled disabled:text-muted'

const variants: Record<ButtonVariant, string> = {
  primary: `border border-transparent bg-primary font-bold text-white enabled:hover:brightness-90 ${boxedDisabled}`,
  outline: `border border-primary bg-transparent font-medium text-primary enabled:hover:bg-primary/10 ${boxedDisabled}`,
  text: 'font-semibold text-primary enabled:hover:underline disabled:text-faint',
  google: `border border-transparent bg-google font-normal text-ink-2 enabled:hover:brightness-95 ${boxedDisabled}`,
}

// A link has no `enabled` state, so its hover applies unconditionally.
const linkHover: Partial<Record<ButtonVariant, [string, string]>> = {
  primary: ['enabled:hover:brightness-90', 'hover:brightness-90'],
  outline: ['enabled:hover:bg-primary/10', 'hover:bg-primary/10'],
  text: ['enabled:hover:underline', 'hover:underline'],
  google: ['enabled:hover:brightness-95', 'hover:brightness-95'],
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
  let look = variants[variant]
  const hover = linkHover[variant]
  if (asLink && hover) look = look.replace(hover[0], hover[1])
  return [
    'inline-flex cursor-pointer items-center justify-center rounded-button transition disabled:cursor-not-allowed',
    look,
    variant === 'text' ? textSizes[size] : boxedSizes[size],
    variant === 'google' && size === 'md' ? 'gap-4' : '',
    fullWidth ? 'w-full' : '',
  ]
    .filter(Boolean)
    .join(' ')
}

/** Icon size that goes with each button size. */
export const buttonIconSize: Record<ButtonSize, number> = { md: 20, sm: 16 }
