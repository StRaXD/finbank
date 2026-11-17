import mastercardLogo from '../../../assets/brands/mastercard.svg'
import visaLogo from '../../../assets/brands/visa.svg'
import type { CardNetwork } from '../../../api/types.ts'

// Sizes measured from 105. Balances.png: the Mastercard mark is ~40×26, the VISA wordmark ~43×14.
const logos: Record<CardNetwork, { src: string; alt: string; className: string }> = {
  mastercard: { src: mastercardLogo, alt: 'Mastercard', className: 'h-6 w-auto' },
  visa: { src: visaLogo, alt: 'VISA', className: 'h-3.5 w-auto' },
}

/** A card network's brand mark (Epic 1 brand assets). */
export function NetworkLogo({ network }: { network: CardNetwork }) {
  const logo = logos[network]
  return <img src={logo.src} alt={logo.alt} className={logo.className} />
}
