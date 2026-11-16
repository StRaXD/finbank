import type { ComponentPropsWithRef } from 'react'
import googleLogo from '../assets/brands/google.svg'
import { icons, type IconName } from './icons.ts'

export type ButtonVariant = 'primary' | 'outline' | 'text' | 'google'

export type ButtonProps = Omit<ComponentPropsWithRef<'button'>, 'className'> & {
  variant?: ButtonVariant
  /** `sm` is the compact size used for "Details >" style actions. */
  size?: 'md' | 'sm'
  fullWidth?: boolean
  leadingIcon?: IconName
  trailingIcon?: IconName
}

// Boxed variants share the grey disabled look of the grey "Login" in Components-1.png.
const boxedDisabled = 'disabled:border-transparent disabled:bg-disabled disabled:text-muted'

const variants: Record<ButtonVariant, string> = {
  primary: `border border-transparent bg-primary font-bold text-white enabled:hover:brightness-90 ${boxedDisabled}`,
  outline: `border border-primary bg-transparent font-medium text-primary enabled:hover:bg-primary/10 ${boxedDisabled}`,
  text: 'font-semibold text-primary enabled:hover:underline disabled:text-faint',
  google: `border border-transparent bg-google font-normal text-ink-2 enabled:hover:brightness-95 ${boxedDisabled}`,
}

const boxedSizes = {
  md: 'h-12 gap-2 px-6 text-16',
  sm: 'h-8 gap-1 px-3 text-12',
} as const

// The text variant has no padding box.
const textSizes = {
  md: 'gap-2 text-16',
  sm: 'gap-1 text-14',
} as const

export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  leadingIcon,
  trailingIcon,
  type = 'button',
  children,
  ...rest
}: ButtonProps) {
  const LeadingIcon = leadingIcon ? icons[leadingIcon] : undefined
  const TrailingIcon = trailingIcon ? icons[trailingIcon] : undefined
  const iconSize = size === 'sm' ? 16 : 20
  const className = [
    'inline-flex cursor-pointer items-center justify-center rounded-button transition disabled:cursor-not-allowed',
    variants[variant],
    variant === 'text' ? textSizes[size] : boxedSizes[size],
    variant === 'google' && size === 'md' ? 'gap-4' : '',
    fullWidth ? 'w-full' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <button type={type} {...rest} className={className}>
      {variant === 'google' && <img src={googleLogo} alt="" width={24} height={24} data-testid="google-logo" />}
      {LeadingIcon && <LeadingIcon aria-hidden="true" data-icon={leadingIcon} size={iconSize} />}
      {children}
      {TrailingIcon && <TrailingIcon aria-hidden="true" data-icon={trailingIcon} size={iconSize} />}
    </button>
  )
}
