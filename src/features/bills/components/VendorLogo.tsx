import adobeLogo from '../../../assets/brands/adobe.svg'
import figmaLogo from '../../../assets/brands/figma.svg'
import googleLogo from '../../../assets/brands/google.svg'
import type { BillLogo } from '../../../api/types.ts'

export type VendorLogoSize = 'md' | 'sm'

// Mark heights measured from 108. Bills.png: Figma ~40px, Adobe ~31px. The vendor names keep their
// brand colour (Adobe red, the others ink) through tokens.
const logos: Record<BillLogo, { src: string; mark: Record<VendorLogoSize, string>; name: string }> = {
  figma: { src: figmaLogo, mark: { md: 'h-10', sm: 'h-5' }, name: 'text-ink' },
  adobe: { src: adobeLogo, mark: { md: 'h-8', sm: 'h-4.5' }, name: 'text-brand-adobe' },
  google: { src: googleLogo, mark: { md: 'h-8', sm: 'h-4.5' }, name: 'text-ink' },
}

const nameSize: Record<VendorLogoSize, string> = {
  md: 'text-24 gap-3',
  sm: 'text-16 gap-1.5',
}

/** A bill vendor's brand mark (Epic 1 brand assets) with its name in the brand style of 108. */
export function VendorLogo({ logo, vendor, size = 'md' }: { logo: BillLogo; vendor: string; size?: VendorLogoSize }) {
  const brand = logos[logo]
  return (
    <span className={`inline-flex items-center font-medium ${nameSize[size]} ${brand.name}`}>
      {/* The vendor name follows as text, so the mark itself is decorative. */}
      <img src={brand.src} alt="" data-logo={logo} className={`${brand.mark[size]} w-auto shrink-0`} />
      <span>{vendor}</span>
    </span>
  )
}
