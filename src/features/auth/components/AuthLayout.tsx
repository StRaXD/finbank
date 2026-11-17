import type { ReactNode } from 'react'
import wordmarkTeal from '../../../assets/brands/wordmark-teal.svg'

/**
 * Vertical rhythm per screen, measured from the PNGs at 1440×1024: `default` is Login (wordmark at
 * 160px), `high` is Signup (112px), `low` is Forgot Password (230px, with a larger heading gap).
 */
export type AuthLayoutPlacement = 'high' | 'default' | 'low'

const topPadding: Record<AuthLayoutPlacement, string> = {
  high: 'pt-28',
  default: 'pt-40',
  low: 'pt-57.5',
}

// Gaps around the visible heading. Login (`default`) has no visible heading, so it has no entry.
const headingRhythm: Partial<Record<AuthLayoutPlacement, { headingGap: string; contentGap: string }>> = {
  high: { headingGap: 'mt-9.5', contentGap: 'mt-8.75' },
  low: { headingGap: 'mt-11', contentGap: 'mt-8.5' },
}
const fallbackRhythm = { headingGap: 'mt-9.5', contentGap: 'mt-8.75' }

type CommonProps = {
  /** The page's only `h1`. */
  title: string
  placement?: AuthLayoutPlacement
  children: ReactNode
}

export type AuthLayoutProps = CommonProps &
  (
    | {
        /** Login: the `h1` is visually hidden, because the design shows just the wordmark. */
        showTitle?: false
        subtitle?: never
      }
    | {
        /** Signup, Forgot Password: the title is a centred heading under the wordmark. */
        showTitle: true
        /** Centred text under the visible title. */
        subtitle?: string
      }
  )

/** The shared auth column (101–103 PNGs): 400px wide on `surface`, teal wordmark on top. */
export function AuthLayout({ title, showTitle = false, subtitle, placement = 'default', children }: AuthLayoutProps) {
  const rhythm = headingRhythm[placement] ?? fallbackRhythm
  return (
    <main className={`min-h-screen bg-surface pb-16 ${topPadding[placement]}`}>
      <div className="mx-auto flex w-100 flex-col">
        {!showTitle && <h1 className="sr-only">{title}</h1>}
        <img src={wordmarkTeal} alt="FINEbank.IO" width={271} height={31} className="self-center" />
        {showTitle ? (
          <>
            <div className={`${rhythm.headingGap} flex flex-col items-center text-center`}>
              <h1 className="text-24 font-bold text-ink">{title}</h1>
              {subtitle && <p className="mt-3.5 max-w-80 text-18 leading-6.5 text-muted">{subtitle}</p>}
            </div>
            <div className={rhythm.contentGap}>{children}</div>
          </>
        ) : (
          <div className="mt-16.5">{children}</div>
        )}
      </div>
    </main>
  )
}
