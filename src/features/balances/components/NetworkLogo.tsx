import mastercardLogo from '../../../assets/brands/mastercard.svg'
import visaLogo from '../../../assets/brands/visa.svg'
import { type AccountType, type CardNetwork, hasCardNetwork } from '../../../api/types.ts'
import { icons } from '../../../ui/icons.ts'

type BrandNetwork = Exclude<CardNetwork, 'other'>

// Sizes measured from 105. Balances.png: the Mastercard mark is ~40×26, the VISA wordmark ~43×14.
const logos: Record<BrandNetwork, { src: string; alt: string; className: string }> = {
  mastercard: { src: mastercardLogo, alt: 'Mastercard', className: 'h-6 w-auto' },
  visa: { src: visaLogo, alt: 'VISA', className: 'h-3.5 w-auto' },
}

function isBrandNetwork(network: unknown): network is BrandNetwork {
  return typeof network === 'string' && Object.hasOwn(logos, network)
}

/** The neutral icon's size: the Mastercard mark's 24px height (`h-6`). */
const NEUTRAL_ICON_SIZE = 24

export type NetworkLogoProps = {
  /** The account type decides whether a mark is shown at all: only cards carry one. */
  type: AccountType
  network?: CardNetwork
  /** `grid`: the white Balances card. `onDark`: the teal Overview slide. */
  tone?: 'grid' | 'onDark'
}

/**
 * A card account's network mark. Credit Card and Checking show the Visa or Mastercard logo (Epic 1
 * brand assets) only for that network; "Other", an unknown or a missing network shows a neutral
 * card icon, so a wrong logo is never displayed. Other types show nothing, whatever is stored.
 */
export function NetworkLogo({ type, network, tone = 'grid' }: NetworkLogoProps) {
  if (!hasCardNetwork(type)) return null
  if (isBrandNetwork(network)) {
    const logo = logos[network]
    return <img src={logo.src} alt={logo.alt} className={logo.className} />
  }
  const CardIcon = icons.creditCard
  return (
    <CardIcon
      role="img"
      aria-label="Other card network"
      aria-hidden={false}
      data-icon="creditCard"
      size={NEUTRAL_ICON_SIZE}
      className={`shrink-0 ${tone === 'onDark' ? 'text-on-dark' : 'text-subtle'}`}
    />
  )
}
