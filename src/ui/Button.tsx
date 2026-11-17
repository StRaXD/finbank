import type { ComponentPropsWithRef } from 'react'
import googleLogo from '../assets/brands/google.svg'
import { buttonClassName, buttonIconSize, type ButtonSize, type ButtonVariant } from './buttonStyles.ts'
import { icons, type IconName } from './icons.ts'

export type { ButtonVariant } from './buttonStyles.ts'

export type ButtonProps = Omit<ComponentPropsWithRef<'button'>, 'className'> & {
  variant?: ButtonVariant
  /** `sm` is the compact size used for "Details >" style actions. */
  size?: ButtonSize
  fullWidth?: boolean
  leadingIcon?: IconName
  trailingIcon?: IconName
}

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
  const iconSize = buttonIconSize[size]
  const className = buttonClassName({ variant, size, fullWidth })

  return (
    <button type={type} {...rest} className={className}>
      {variant === 'google' && <img src={googleLogo} alt="" width={24} height={24} data-testid="google-logo" />}
      {LeadingIcon && <LeadingIcon aria-hidden="true" data-icon={leadingIcon} size={iconSize} />}
      {children}
      {TrailingIcon && <TrailingIcon aria-hidden="true" data-icon={trailingIcon} size={iconSize} />}
    </button>
  )
}
